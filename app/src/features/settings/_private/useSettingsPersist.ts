import { useCallback, useRef } from "react";

import type { DataPort } from "@db/DataPort";

import { SETTINGS_CONFIG_ID } from "../settingsSchema";
import type { SettingsBody } from "../settingsSchema";
import { loadSettingsRow } from "./loadSettingsRow";

export interface UseSettingsPersist {
    persist: (next: SettingsBody) => Promise<void>;
    /**
     * Read-latest-then-patch: re-reads the row from the DB immediately before
     * writing and applies `mutator` to that fresh copy, rather than to
     * whatever `settings` snapshot the caller's closure captured. Use this
     * (instead of `persist`) for any background/async write that only
     * intends to touch one of its own fields — e.g. `recordDailySummarySent`
     * — so it can never silently clobber an unrelated admin edit that landed
     * while the write was in flight (a long SMTP send, for example).
     * `mutator` returning the same object it was given is treated as "no
     * change" and skips the write entirely.
     */
    persistPatch: (mutator: (current: SettingsBody) => SettingsBody) => Promise<void>;
}

// Split out of useSettingsRecord (over the line budget — docs/CodingStandards.md)
// — the two DB write paths (`persist`/`persistPatch`), unchanged from the
// inline versions they replace.
export const useSettingsPersist = (
    db: DataPort,
    version: number,
    setSettings: (body: SettingsBody) => void,
    setVersion: (version: number) => void,
): UseSettingsPersist => {
    // "Latest" ref, kept current on every render — so `persist` (used by the
    // manual Settings save path) always writes `version + 1` off the real
    // current version instead of whatever `version` its own `useCallback`
    // closed over. Mutating a ref during render is safe here: it's never
    // read during render, only from callbacks that run afterwards.
    const versionRef = useRef(version);
    versionRef.current = version;

    const persist = useCallback(
        async (next: SettingsBody): Promise<void> => {
            const row = await db.saveConfig({
                ConfigId: SETTINGS_CONFIG_ID,
                ConfigKind: "Settings",
                Body: next,
                Version: versionRef.current + 1,
            });
            setSettings(next);
            setVersion(row.Version);
        },
        [db, setSettings, setVersion],
    );

    // See the doc comment above — re-reads the row fresh right before
    // writing, so `mutator` always applies on top of whatever the DB
    // actually holds right now, not a snapshot from whenever the caller's
    // closure was created.
    const persistPatch = useCallback(
        async (mutator: (current: SettingsBody) => SettingsBody): Promise<void> => {
            const { body: current, version: currentVersion } = await loadSettingsRow(db);
            const next = mutator(current);
            if (next === current) return;
            const row = await db.saveConfig({
                ConfigId: SETTINGS_CONFIG_ID,
                ConfigKind: "Settings",
                Body: next,
                Version: currentVersion + 1,
            });
            setSettings(next);
            setVersion(row.Version);
        },
        [db, setSettings, setVersion],
    );

    return { persist, persistPatch };
};
