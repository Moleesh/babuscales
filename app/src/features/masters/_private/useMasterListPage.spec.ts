import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataPort } from "@db/DataPort";
import type { MasterQuery, MasterRow } from "@db/types";

import { useMasterListPage } from "./useMasterListPage";

const row = (masterId: string, name: string, autoAdded = false): MasterRow => ({
    MasterId: masterId,
    MasterKind: "Party",
    Name: name,
    Body: autoAdded ? { AutoAdded: true } : {},
    IsActive: true,
    UpdatedAt: "2026-01-01T00:00:00.000Z",
});

const makeRows = (n: number, prefix = "p"): MasterRow[] =>
    Array.from({ length: n }, (_, i) => row(`${prefix}${i}`, `Name${i}`));

const fakeDb = (listMasters: (q?: MasterQuery) => Promise<MasterRow[]>): DataPort =>
    ({ listMasters }) as unknown as DataPort;

describe("useMasterListPage", () => {
    it("loads the first page (50) and sets hasMore when the page is full", async () => {
        const db = fakeDb(async () => makeRows(50));
        const { result } = renderHook(() => useMasterListPage(db, "Party", ""));
        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rows).toHaveLength(50);
        expect(result.current.hasMore).toBe(true);
    });

    it("hasMore is false when the page comes back short", async () => {
        const db = fakeDb(async () => makeRows(10));
        const { result } = renderHook(() => useMasterListPage(db, "Party", ""));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.hasMore).toBe(false);
    });

    it("filters out AutoAdded rows from the visible list", async () => {
        const db = fakeDb(async () => [row("a", "A"), row("b", "B", true), row("c", "C")]);
        const { result } = renderHook(() => useMasterListPage(db, "Party", ""));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rows.map((r) => r.MasterId)).toEqual(["a", "c"]);
    });

    it("loadMore appends a second page using the last raw row as the cursor", async () => {
        const calls: (MasterQuery | undefined)[] = [];
        const db = fakeDb(async (q) => {
            calls.push(q);
            if (!q?.After) return makeRows(50, "p");
            return makeRows(20, "q");
        });
        const { result } = renderHook(() => useMasterListPage(db, "Party", ""));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => result.current.loadMore());
        await waitFor(() => expect(result.current.loadingMore).toBe(false));
        expect(result.current.rows).toHaveLength(70);
        expect(result.current.hasMore).toBe(false); // 20 < PAGE_SIZE(50)
        expect(calls[1]?.After).toEqual({ Name: "Name49", MasterId: "p49" });
    });

    it("loadMore cursors off the raw (unfiltered) last row, not the AutoAdded-filtered one", async () => {
        const calls: (MasterQuery | undefined)[] = [];
        const db = fakeDb(async (q) => {
            calls.push(q);
            if (!q?.After) return [row("a", "A"), row("b", "B", true)];
            return [];
        });
        const { result } = renderHook(() => useMasterListPage(db, "Party", ""));
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => result.current.loadMore());
        await waitFor(() => expect(result.current.loadingMore).toBe(false));
        // cursor should be row "b" (the raw last row), even though it was filtered out of `rows`.
        expect(calls[1]?.After).toEqual({ Name: "B", MasterId: "b" });
    });

    it("loadMore is a no-op when already loading more or no cursor exists", async () => {
        const listMasters = vi.fn(async () => [] as MasterRow[]);
        const db = fakeDb(listMasters);
        const { result } = renderHook(() => useMasterListPage(db, "Party", ""));
        await waitFor(() => expect(result.current.loading).toBe(false));
        // No rows at all -> no cursor -> loadMore should not call listMasters again.
        const callsBefore = listMasters.mock.calls.length;
        await act(async () => result.current.loadMore());
        expect(listMasters.mock.calls.length).toBe(callsBefore);
    });

    it("includes Search in the query only when the query string is non-empty", async () => {
        const listMasters = vi.fn(async (_q?: MasterQuery) => [] as MasterRow[]);
        const db = fakeDb(listMasters);
        renderHook(() => useMasterListPage(db, "Party", "acme"));
        await waitFor(() => expect(listMasters).toHaveBeenCalled());
        const firstCall = listMasters.mock.calls[0];
        expect(firstCall?.[0]).toEqual(expect.objectContaining({ Search: "acme" }));
    });

    it("a kind/query change restarts at one page-worth (limit=PAGE_SIZE) even after loadMore accumulated more", async () => {
        const calls: (MasterQuery | undefined)[] = [];
        const db = fakeDb(async (q) => {
            calls.push(q);
            if (calls.length === 1) return makeRows(50, "p");
            if (calls.length === 2) return makeRows(50, "q"); // via loadMore
            return makeRows(5, "r"); // new query scope
        });
        const { result, rerender } = renderHook(({ query }) => useMasterListPage(db, "Party", query), {
            initialProps: { query: "" },
        });
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => result.current.loadMore());
        await waitFor(() => expect(result.current.loadingMore).toBe(false));
        expect(result.current.rows).toHaveLength(100);

        rerender({ query: "new" });
        await waitFor(() => expect(result.current.rows).toHaveLength(5));
        expect(calls[2]?.Limit).toBe(50);
    });

    it("a refreshToken bump re-fetches the previously-accumulated amount (100), not just one page", async () => {
        const calls: (MasterQuery | undefined)[] = [];
        const db = fakeDb(async (q) => {
            calls.push(q);
            return makeRows(q?.Limit ?? 0, "x");
        });
        const { result, rerender } = renderHook(({ token }) => useMasterListPage(db, "Party", "", token), {
            initialProps: { token: 0 },
        });
        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => result.current.loadMore());
        await waitFor(() => expect(result.current.loadingMore).toBe(false));
        expect(result.current.rows).toHaveLength(100); // 50 (initial) + 50 (loadMore, PAGE_SIZE)

        rerender({ token: 1 });
        await waitFor(() => expect(calls.length).toBe(3));
        expect(calls[2]?.Limit).toBe(100); // max(PAGE_SIZE, rawCountRef=100)
    });
});
