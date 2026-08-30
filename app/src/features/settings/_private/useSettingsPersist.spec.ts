import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataPort } from "@db/DataPort";
import type { ConfigDraft, ConfigRow } from "@db/types";

import { SYNC_DEFAULT_BODY } from "./loadSettingsRow";
import { useSettingsPersist } from "./useSettingsPersist";
import { SETTINGS_CONFIG_ID } from "../settingsSchema";
import type { SettingsBody } from "../settingsSchema";

const configRow = (body: SettingsBody, version: number): ConfigRow => ({
    ConfigId: SETTINGS_CONFIG_ID,
    ConfigKind: "Settings",
    Body: body,
    Version: version,
    UpdatedAt: "2026-01-01T00:00:00.000Z",
});

describe("useSettingsPersist: persist", () => {
    it("writes version+1 off the current version prop, and applies setSettings/setVersion from the result", async () => {
        const saveConfig = vi.fn(async (draft: ConfigDraft) => configRow(draft.Body as SettingsBody, draft.Version ?? 0));
        const db = { saveConfig } as unknown as DataPort;
        let settings: SettingsBody | null = null;
        let version = 0;
        const { result, rerender } = renderHook(
            ({ v }) =>
                useSettingsPersist(
                    db,
                    v,
                    (s) => {
                        settings = s;
                    },
                    (ver) => {
                        version = ver;
                    },
                ),
            { initialProps: { v: 5 } },
        );

        const next = { ...SYNC_DEFAULT_BODY, OperatorName: "New" };
        await act(async () => result.current.persist(next));
        expect(saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({ ConfigId: SETTINGS_CONFIG_ID, Version: 6, Body: next }),
        );
        expect(settings).toEqual(next);
        expect(version).toBe(6);
        rerender({ v: 5 });
    });

    it("always uses the freshest version prop (via the internal ref), not a stale closed-over one", async () => {
        const saveConfig = vi.fn(async (draft: ConfigDraft) => configRow(draft.Body as SettingsBody, draft.Version ?? 0));
        const db = { saveConfig } as unknown as DataPort;
        const { result, rerender } = renderHook(
            ({ v }) => useSettingsPersist(db, v, () => undefined, () => undefined),
            { initialProps: { v: 1 } },
        );
        rerender({ v: 10 }); // version prop bumped without re-creating persist via a dependency change
        await act(async () => result.current.persist(SYNC_DEFAULT_BODY));
        expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({ Version: 11 }));
    });
});

describe("useSettingsPersist: persistPatch", () => {
    it("re-reads the row fresh, applies mutator, writes currentVersion+1", async () => {
        const freshBody = { ...SYNC_DEFAULT_BODY, OperatorName: "FreshFromDb" };
        const getConfig = vi.fn(async () => configRow(freshBody, 9));
        const saveConfig = vi.fn(async (draft: ConfigDraft) => configRow(draft.Body as SettingsBody, draft.Version ?? 0));
        const db = { getConfig, saveConfig } as unknown as DataPort;
        const box: { settings: SettingsBody | null; version: number } = { settings: null, version: 0 };
        const { result } = renderHook(() =>
            useSettingsPersist(
                db,
                0,
                (s) => {
                    box.settings = s;
                },
                (v) => {
                    box.version = v;
                },
            ),
        );

        await act(async () =>
            result.current.persistPatch((current) => ({ ...current, DailySummary: { ...current.DailySummary, LastSentDate: "2026-06-01" } })),
        );
        expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({ Version: 10 }));
        expect(box.settings?.OperatorName).toBe("FreshFromDb"); // mutated off the fresh read, not a stale prop
        expect(box.version).toBe(10);
    });

    it("skips the write entirely when mutator returns the same object (no-op)", async () => {
        const getConfig = vi.fn(async () => configRow(SYNC_DEFAULT_BODY, 3));
        const saveConfig = vi.fn();
        const db = { getConfig, saveConfig } as unknown as DataPort;
        const { result } = renderHook(() => useSettingsPersist(db, 0, () => undefined, () => undefined));
        await act(async () => result.current.persistPatch((current) => current));
        expect(saveConfig).not.toHaveBeenCalled();
    });
});
