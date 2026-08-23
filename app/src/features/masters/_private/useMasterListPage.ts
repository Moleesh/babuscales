import { useCallback, useEffect, useRef, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { MasterKind, MasterRow } from "@db/types";

const PAGE_SIZE = 50;

export interface UseMasterListPage {
    rows: MasterRow[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    loadMore: () => void;
}

// Task: a Master's own `HideAutoAddedFromList` (schemaEngine's
// `MasterSchema`) keeps an auto-saved-on-ticket-save row (`Body.AutoAdded`,
// set by `upsertTypedMasters.ts`) out of "the manual 'add new' list/search
// results a user sees when browsing/picking from that Master" — this admin
// screen's own list is that surface. Filtered client-side, after the page
// loads, rather than as a DataPort query param: the flag is a display
// concern of this one screen, not a storage-layer one, and every other
// consumer (useMasterCache.ts's own rows/search — Weighing's typeahead,
// this feature's own upsert-dedup check) is deliberately left untouched, so
// an auto-saved row still autofills/dedups exactly like a normal one.
const visibleRows = (page: MasterRow[]): MasterRow[] => page.filter((row) => row.Body.AutoAdded !== true);

// Keyset-paginated list for MastersListCard only ("Load more"). Independent
// of useMasterCache, which stays the "load
// everything once, filter every keystroke locally" source of truth for
// record-selection/form editing on this screen and for every
// SearchableDropdown elsewhere (useMasterCache.ts) — nothing here touches
// that hook. This one instead round-trips DataPort.listMasters per query
// change and per "Load more" click, using the last row's Name/MasterId as
// the next page's cursor (db/types.ts's MasterQuery.After).
export const useMasterListPage = (
    db: DataPort,
    kind: MasterKind,
    query: string,
    refreshToken = 0,
): UseMasterListPage => {
    const [rows, setRows] = useState<MasterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    // The raw (unfiltered) last row of the most recently fetched page —
    // used as the keyset cursor for "Load more". Cursoring off the
    // AutoAdded-filtered `rows` instead would get stuck forever on a page
    // that's mostly/entirely AutoAdded rows: the filtered array's last row
    // never advances past that page, so the same page gets refetched on
    // every "Load more" click.
    const cursorRef = useRef<MasterRow | null>(null);
    const requestId = useRef(0);
    // How many raw rows the last completed fetch pulled — used to tell a
    // genuine kind/search change (start over at one page) apart from a
    // save/delete/toggle-driven `refreshToken` bump (re-fetch the same
    // amount the user had already loaded via "Load more", instead of
    // silently truncating their accumulated pages back down to one).
    const rawCountRef = useRef(0);
    const kindQueryRef = useRef({ kind, query });

    useEffect(() => {
        const id = ++requestId.current;
        const isNewScope = kindQueryRef.current.kind !== kind || kindQueryRef.current.query !== query;
        kindQueryRef.current = { kind, query };
        const limit = isNewScope ? PAGE_SIZE : Math.max(PAGE_SIZE, rawCountRef.current);
        setLoading(true);
        void db.listMasters({ MasterKind: kind, Search: query || undefined, Limit: limit }).then((page) => {
            if (requestId.current !== id) return;
            setRows(visibleRows(page));
            cursorRef.current = page[page.length - 1] ?? null;
            rawCountRef.current = page.length;
            setHasMore(page.length === limit);
            setLoading(false);
        });
    }, [db, kind, query, refreshToken]);

    const loadMore = useCallback(() => {
        const last = cursorRef.current;
        if (!last || loadingMore) return;
        const id = requestId.current;
        setLoadingMore(true);
        void db
            .listMasters({
                MasterKind: kind,
                Search: query || undefined,
                Limit: PAGE_SIZE,
                After: { Name: last.Name, MasterId: last.MasterId },
            })
            .then((page) => {
                if (requestId.current !== id) return;
                setRows((prev) => [...prev, ...visibleRows(page)]);
                cursorRef.current = page[page.length - 1] ?? cursorRef.current;
                rawCountRef.current += page.length;
                setHasMore(page.length === PAGE_SIZE);
                setLoadingMore(false);
            });
    }, [db, kind, query, loadingMore]);

    return { rows, loading, loadingMore, hasMore, loadMore };
};
