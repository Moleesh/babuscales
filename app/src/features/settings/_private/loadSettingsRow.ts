import type { DataPort } from "@db/DataPort";

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
export const SYNC_DEFAULT_BODY: SettingsBody = {
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

// Fresh install, or a row that failed to parse (shouldn't happen once
// shipped, but a corrupt/foreign Body must not brick the admin gate) —
// create/overwrite with real defaults.
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

// Split out of useSettingsRecord (over the line budget — docs/CodingStandards.md)
// — loads (or seeds) the `"settings"` config row and reports it back, shared
// by the mount effect, `reload()`, and `persistPatch()` so every one of them
// re-runs exactly the same load path instead of a hand-rolled duplicate.
export const loadSettingsRow = async (db: DataPort): Promise<{ body: SettingsBody; version: number }> => {
    const row = await db.getConfig(SETTINGS_CONFIG_ID);
    const parsed = row ? settingsBodySchema.safeParse(row.Body) : null;
    if (row && parsed?.success) {
        return { body: parsed.data, version: row.Version };
    }
    return createDefaultSettingsRow(db);
};
