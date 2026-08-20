import { useCallback, useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import { setTicketNumberFormat } from "@features/weighing";

import { DEFAULT_ADMIN_PASSWORD, hashAdminPassword } from "../adminAuth";
import {
    DEFAULT_BOARD,
    DEFAULT_BUSINESS,
    DEFAULT_CONNECTIONS,
    DEFAULT_DAILY_SUMMARY,
    DEFAULT_FORMATS,
    DEFAULT_INTEGRATIONS,
    DEFAULT_NUMBERING,
    DEFAULT_OPERATOR_NAME,
    DEFAULT_PRINTERS,
    DEFAULT_REMOTE_ACCESS,
    DEFAULT_RULES,
    DEFAULT_SKIN,
    DEFAULT_SMTP,
    DEFAULT_STABILITY,
    DEFAULT_TALLY,
    DEFAULT_TEXT_SCALE,
    DEFAULT_WEBHOOK,
    SETTINGS_CONFIG_ID,
    settingsBodySchema,
} from "../settingsSchema";
import type { SettingsBody } from "../settingsSchema";

// Rendered before the real row has loaded (or on a brand-new install, before
// the default row is created) so nothing downstream has to handle `null` —
// same non-blocking shape as `WeighingScreen`'s own doc list starting empty
// and filling in via effect. An empty admin hash/salt can never verify a
// password, so `unlock()` is safely inert until the real row is in.
const SYNC_DEFAULT_BODY: SettingsBody = {
    Business: DEFAULT_BUSINESS,
    Rules: DEFAULT_RULES,
    Stability: DEFAULT_STABILITY,
    Numbering: DEFAULT_NUMBERING,
    Formats: DEFAULT_FORMATS,
    Connections: DEFAULT_CONNECTIONS,
    Printers: DEFAULT_PRINTERS,
    Integrations: DEFAULT_INTEGRATIONS,
    RemoteAccess: DEFAULT_REMOTE_ACCESS,
    Smtp: DEFAULT_SMTP,
    Webhook: DEFAULT_WEBHOOK,
    Tally: DEFAULT_TALLY,
    Board: DEFAULT_BOARD,
    DailySummary: DEFAULT_DAILY_SUMMARY,
    OperatorName: DEFAULT_OPERATOR_NAME,
    Skin: DEFAULT_SKIN,
    TextScale: DEFAULT_TEXT_SCALE,
    AdminPasswordHash: "",
    AdminPasswordSalt: "",
};

export interface UseSettingsRecord {
    settings: SettingsBody;
    loading: boolean;
    persist: (next: SettingsBody) => Promise<void>;
}

// Fresh install, or a row that failed to parse (shouldn't happen once
// shipped, but a corrupt/foreign Body must not brick the admin gate) —
// create/overwrite with real defaults. Plain function (no hooks) so it
// doesn't count against useSettingsRecord's own line budget.
const createDefaultSettingsRow = async (db: DataPort): Promise<{ body: SettingsBody; version: number }> => {
    const { Hash, Salt } = await hashAdminPassword(DEFAULT_ADMIN_PASSWORD);
    const body: SettingsBody = {
        ...SYNC_DEFAULT_BODY,
        AdminPasswordHash: Hash,
        AdminPasswordSalt: Salt,
    };
    const saved = await db.saveConfig({
        ConfigId: SETTINGS_CONFIG_ID,
        ConfigKind: "Settings",
        Body: body,
    });
    return { body, version: saved.Version };
};

// Split out of SettingsProvider (over the line budget — docs/CodingStandards.md)
// — the `"settings"` config row's load, the two DOM-sync effects that must
// re-run whenever the row changes, and the shared `persist()` write path,
// all unchanged from the inline versions they replace.
export const useSettingsRecord = (db: DataPort): UseSettingsRecord => {
    const [settings, setSettings] = useState<SettingsBody>(SYNC_DEFAULT_BODY);
    const [version, setVersion] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const row = await db.getConfig(SETTINGS_CONFIG_ID);
            if (cancelled) return;
            const parsed = row ? settingsBodySchema.safeParse(row.Body) : null;
            if (row && parsed?.success) {
                setSettings(parsed.data);
                setVersion(row.Version);
                setLoading(false);
                return;
            }
            const { body, version: freshVersion } = await createDefaultSettingsRow(db);
            if (cancelled) return;
            setSettings(body);
            setVersion(freshVersion);
            setLoading(false);
        })().catch((err: unknown) => {
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

    const persist = useCallback(
        async (next: SettingsBody): Promise<void> => {
            const row = await db.saveConfig({
                ConfigId: SETTINGS_CONFIG_ID,
                ConfigKind: "Settings",
                Body: next,
                Version: version + 1,
            });
            setSettings(next);
            setVersion(row.Version);
        },
        [db, version],
    );

    return { settings, loading, persist };
};
