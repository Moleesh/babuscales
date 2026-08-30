import { describe, expect, it, vi } from "vitest";

import type { DataPort } from "@db/DataPort";
import type { ConfigDraft, ConfigRow } from "@db/types";

import { loadSettingsRow, SYNC_DEFAULT_BODY } from "./loadSettingsRow";
import { SETTINGS_CONFIG_ID } from "../settingsSchema";

const fakeDb = (overrides: Partial<DataPort> = {}): DataPort =>
    ({
        getConfig: vi.fn(async () => null),
        saveConfig: vi.fn(async (draft: ConfigDraft) => ({
            ConfigId: draft.ConfigId ?? SETTINGS_CONFIG_ID,
            ConfigKind: draft.ConfigKind,
            Body: draft.Body,
            Version: 1,
            UpdatedAt: "2026-01-01T00:00:00.000Z",
        })),
        ...overrides,
    }) as unknown as DataPort;

describe("loadSettingsRow", () => {
    it("creates and returns a default row (real admin hash/salt, not blank) when no row exists", async () => {
        const db = fakeDb();
        const { body, version } = await loadSettingsRow(db);
        expect(version).toBe(1);
        expect(body.AdminPasswordHash).not.toBe("");
        expect(body.AdminPasswordSalt).not.toBe("");
        expect(body.Business).toEqual(SYNC_DEFAULT_BODY.Business);
        expect(db.saveConfig).toHaveBeenCalledWith(
            expect.objectContaining({ ConfigId: SETTINGS_CONFIG_ID, ConfigKind: "Settings" }),
        );
    });

    it("returns the existing row's parsed body + version when it parses successfully", async () => {
        const validBody = {
            ...SYNC_DEFAULT_BODY,
            AdminPasswordHash: "existing-hash",
            AdminPasswordSalt: "existing-salt",
        };
        const row: ConfigRow = {
            ConfigId: SETTINGS_CONFIG_ID,
            ConfigKind: "Settings",
            Body: validBody,
            Version: 7,
            UpdatedAt: "2026-01-01T00:00:00.000Z",
        };
        const db = fakeDb({ getConfig: vi.fn(async () => row) });
        const { body, version } = await loadSettingsRow(db);
        expect(version).toBe(7);
        expect(body.AdminPasswordHash).toBe("existing-hash");
        expect(db.saveConfig).not.toHaveBeenCalled();
    });

    it("falls back to creating a default row when the existing row's Body fails to parse (corrupt/foreign)", async () => {
        const row: ConfigRow = {
            ConfigId: SETTINGS_CONFIG_ID,
            ConfigKind: "Settings",
            Body: { bogus: true },
            Version: 3,
            UpdatedAt: "2026-01-01T00:00:00.000Z",
        };
        const db = fakeDb({ getConfig: vi.fn(async () => row) });
        const { body, version } = await loadSettingsRow(db);
        expect(version).toBe(1); // the freshly-saved default row's version, not the corrupt row's 3
        expect(body.AdminPasswordHash).not.toBe("");
        expect(db.saveConfig).toHaveBeenCalled();
    });
});
