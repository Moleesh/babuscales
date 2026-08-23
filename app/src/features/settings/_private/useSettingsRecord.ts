import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import { setTicketNumberFormat } from "@features/weighing";

import type { SettingsBody } from "../settingsSchema";
import { loadSettingsRow, SYNC_DEFAULT_BODY } from "./loadSettingsRow";
import { useSettingsPersist } from "./useSettingsPersist";

export interface UseSettingsRecord {
    settings: SettingsBody;
    loading: boolean;
    persist: (next: SettingsBody) => Promise<void>;
    persistPatch: (mutator: (current: SettingsBody) => SettingsBody) => Promise<void>;
    /** Re-reads the settings row from the DB and replaces in-memory state with it — used after a backup restore swaps the whole backing store out from under whatever was last loaded. */
    reload: () => Promise<void>;
}

// Split out of SettingsProvider (over the line budget — docs/CodingStandards.md)
// — the `"settings"` config row's load, the two DOM-sync effects that must
// re-run whenever the row changes, and the shared persist path (further
// split into useSettingsPersist.ts, also over budget on its own), all
// unchanged from the inline versions they replace.
export const useSettingsRecord = (db: DataPort): UseSettingsRecord => {
    const [settings, setSettings] = useState<SettingsBody>(SYNC_DEFAULT_BODY);
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void loadSettingsRow(db)
            .then(({ body, version: loadedVersion }) => {
                if (cancelled) return;
                setSettings(body);
                setVersion(loadedVersion);
                setLoading(false);
            })
            .catch((err: unknown) => {
                // Unhandled before this: a rejected getConfig/saveConfig left
                // `loading` stuck true forever with no trace of why — clearing
                // it here at least lets the rest of the app proceed on the
                // SYNC_DEFAULT_BODY fallback instead of hanging on a spinner.
                console.error("Settings record load failed", err);
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [db]);

    // Pushed to the module-level formatter every time the numbering changes
    // (see @features/weighing's ticketNumber.ts) — the components that call
    // `formatTicketNo` don't otherwise touch Settings.
    useEffect(() => {
        setTicketNumberFormat({
            prefix: settings.Numbering.Prefix,
            width: settings.Numbering.Width,
        });
    }, [settings.Numbering.Prefix, settings.Numbering.Width]);

    // Task #51 — applies the Theme pick to the live DOM globally (not just
    // while the Appearance pane is mounted), same `data-skin`/`--s` targets
    // as the mock's own `setSkin`/`setFs` (demo/BabuScales-demo.html).
    // Deliberately not `loading`-gated: SYNC_DEFAULT_BODY's own Skin/TextScale
    // are real defaults, so applying them before the row loads just means
    // the default theme paints first rather than a flash of unstyled root.
    useEffect(() => {
        document.documentElement.setAttribute("data-skin", settings.Skin);
        document.documentElement.style.setProperty("--s", String(settings.TextScale));
    }, [settings.Skin, settings.TextScale]);

    const { persist, persistPatch } = useSettingsPersist(db, version, setSettings, setVersion);

    const reload = async (): Promise<void> => {
        const { body, version: loadedVersion } = await loadSettingsRow(db);
        setSettings(body);
        setVersion(loadedVersion);
    };

    return { settings, loading, persist, persistPatch, reload };
};
