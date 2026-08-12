import { z } from "zod";

// One row, one ConfigId, `ConfigKind: "Settings"` (already in `CONFIG_KINDS`
// — src/db/types.ts). Everything on this screen is a row in the database,
// same as the mock's own "Fixed policy" says it should be — see
// demo/BabuScales-demo.html's POLICY array, item 3.
export const SETTINGS_CONFIG_ID = "settings";

export const RESET_EVERY_OPTIONS = ["year", "cal", "month", "day"] as const;
export type ResetEvery = (typeof RESET_EVERY_OPTIONS)[number];

// Mock's own comment (demo/BabuScales-demo.html, just above RULE_DEFS):
// "Only three rules survive. Required-ness moved into the schema JSON;
// reprint stamping and the cancellation reason are fixed policy, not
// toggles." — those three are exactly what's here. `MultiGross` is a fourth,
// added for task #46 with no mock precedent (PLAN §7.1 tags multi-gross
// "(future)" and the reference mock never built it) — off by default, same
// "zero behaviour change until an admin opts in" shape as every other rule.
const rulesSchema = z.object({
    TareFirst: z.boolean(),
    StrictTare: z.boolean(),
    AutoCapture: z.boolean(),
    MultiGross: z.boolean(),
});
export type WeighingRules = z.infer<typeof rulesSchema>;

const stabilitySchema = z.object({
    ReadingsInRow: z.number().int().min(1).max(20),
    BandKg: z.number().int().min(1).max(200),
});
export type StabilityGate = z.infer<typeof stabilitySchema>;

const numberingSchema = z.object({
    Prefix: z.string().max(12),
    Width: z.number().int().min(3).max(9),
    AutoReset: z.boolean(),
    ResetEvery: z.enum(RESET_EVERY_OPTIONS),
    ResetOn: z.string(),
});
export type TicketNumbering = z.infer<typeof numberingSchema>;

const formatsSchema = z.object({
    DateFmt: z.string(),
    TimeFmt: z.enum(["24", "12"]),
    AmountDp: z.union([z.literal(0), z.literal(2)]),
});
export type DisplayFormats = z.infer<typeof formatsSchema>;

export const BAUD_RATE_OPTIONS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

// demo/BabuScales-demo.html's PRINTERS fixture, verbatim. The browser print
// dialog (window.print(), engines/print) always lets the operator pick the
// real target printer themselves, on both the demo and the desktop build —
// so this list stays a stated *preference* (which detected printer plays
// the "A4"/"Mx"/"Th" role), not a live binding, same as the mock. Task #52
// added real driver-level enumeration (@engines/printers, PrintPane.tsx's
// "Detected printers" card) so an admin can see what's actually plugged in
// while choosing a preference here — the mock never had that.
export const PRINTER_KINDS = ["a4", "mx", "th"] as const;
export type PrinterKind = (typeof PRINTER_KINDS)[number];
export interface PrinterFixture {
    name: string;
    kind: PrinterKind;
}
export const PRINTER_FIXTURES: readonly PrinterFixture[] = [
    { name: "HP LaserJet M1005", kind: "a4" },
    { name: "Canon LBP2900B", kind: "a4" },
    { name: "Microsoft Print to PDF", kind: "a4" },
    { name: "Epson LX-310", kind: "mx" },
    { name: "TVS MSP 250 Star", kind: "mx" },
    { name: "TVS RP 3200 Star", kind: "th" },
    { name: "Everycom 58 mm", kind: "th" },
];

const printersSchema = z.object({
    A4: z.string(),
    Mx: z.string(),
    Th: z.string(),
});
export type PrintersConfig = z.infer<typeof printersSchema>;

// demo/BabuScales-demo.html's INTEGRATIONS fixture, verbatim — the mock's
// own `renderInts` toggles `x.on` and re-renders for real (unlike the
// Export buttons or the New-template wizard, this bit of the mock is
// genuinely interactive), so this is a persisted on/off, not a display-only
// placeholder. "Configure" stays decorative in the mock too — it never
// opens a real per-channel form (SMTP host, API token, ...), just flashes
// "<name> · <cfg> — stored in the settings table" — ported the same way.
export const INTEGRATION_KEYS = [
    "whatsapp",
    "sms",
    "email",
    "backup",
    "webhook",
    "qr",
    "tally",
    "board",
] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];
export interface IntegrationFixture {
    key: IntegrationKey;
    name: string;
    config: string;
}
export const INTEGRATION_FIXTURES: readonly IntegrationFixture[] = [
    // Task #44 — WhatsApp stays decorative by decision, not oversight, and
    // unlike every other still-decorative row here it never will get a real
    // worker: WhatsApp only has two paths in, and neither is a fit. (1) Meta's
    // official Cloud API needs a paid, Meta-approved business account and a
    // per-message cost — the thing PLAN.md §23 open question 5 flags as "the
    // only per-message cost" left once SMS (task #43) sidestepped it via a
    // bring-your-own serial GSM modem. WhatsApp has no serial/AT-command
    // equivalent — it's a proprietary end-to-end-encrypted app protocol, not
    // a modem you can talk to over a COM port. (2) The unofficial libraries
    // that impersonate a WhatsApp Web session (Baileys, whatsapp-web.js) are
    // free but violate WhatsApp's Terms of Service and risk the site's own
    // number getting banned — not something to ship into a paid product.
    { key: "whatsapp", name: "WhatsApp", config: "Business API token" },
    { key: "sms", name: "SMS gateway", config: "GSM modem · serial port" },
    { key: "email", name: "E-mail", config: "SMTP host · port · user" },
    { key: "backup", name: "Cloud backup", config: "Provider · schedule" },
    { key: "webhook", name: "Webhook / REST", config: "Endpoint · secret" },
    { key: "qr", name: "QR verification page", config: "Public URL" },
    { key: "tally", name: "Accounting export", config: "Format · folder" },
    { key: "board", name: "Outdoor display board", config: "Port · protocol" },
];

// PLAN §18's own separate "Remote access — Cloudflare Tunnel" spec — not
// one of the mock's eight INTEGRATIONS fixtures (it doesn't appear in
// demo/BabuScales-demo.html at all), so it isn't ported alongside them.
// The connector token itself never lives in this schema, or in any
// settings row — it's a secret (src-tauri/src/security/mod.rs, Windows
// Credential Manager only), and this `Enabled` flag is the only part of
// "on or off" that's safe to persist as ordinary config.
const remoteAccessSchema = z.object({
    Enabled: z.boolean(),
});
export type RemoteAccessConfig = z.infer<typeof remoteAccessSchema>;

// Task #51 — Appearance pane's `SKINS` array (demo/BabuScales-demo.html),
// verbatim keys/names/swatch colours. The skins themselves already live in
// styles/tokens.css as `[data-skin="…"]` blocks (ported in an earlier
// task); this is just the picker's own fixture list, same "fixed list, no
// admin-authoring UI" shape as PRINTER_FIXTURES/INTEGRATION_FIXTURES above.
export const SKIN_KEYS = ["indicator", "graphite", "night", "paper", "daylight", "contrast"] as const;
export type SkinKey = (typeof SKIN_KEYS)[number];
export interface SkinFixture {
    key: SkinKey;
    name: string;
    /** Four swatch colours, mock order: void, panel, accent (led), stable. */
    swatch: readonly [string, string, string, string];
}
export const SKIN_FIXTURES: readonly SkinFixture[] = [
    { key: "indicator", name: "Indicator", swatch: ["#0B0E0F", "#1B2325", "#FFA92E", "#3ECF8E"] },
    { key: "graphite", name: "Graphite", swatch: ["#0C1013", "#1C242B", "#4FD6C9", "#5FD08A"] },
    { key: "night", name: "Night shift", swatch: ["#0A0705", "#1D1710", "#FF7A1A", "#B7C24E"] },
    { key: "paper", name: "Paper", swatch: ["#EDE8DE", "#FFFDF8", "#9A3412", "#14733F"] },
    { key: "daylight", name: "Daylight", swatch: ["#E8EDF2", "#FFFFFF", "#0B5FBF", "#0E7C4F"] },
    { key: "contrast", name: "High contrast", swatch: ["#000000", "#141414", "#FFD400", "#00E07A"] },
];

// Mock's own `#fsBar` — four fixed steps, not a free slider (`cfg.fs`
// stores the raw multiplier, applied to `--s` in tokens.css).
export const TEXT_SCALE_OPTIONS = [0.9, 1, 1.12, 1.28] as const;
export type TextScale = (typeof TEXT_SCALE_OPTIONS)[number];

const integrationsSchema = z.object({
    whatsapp: z.boolean(),
    sms: z.boolean(),
    email: z.boolean(),
    backup: z.boolean(),
    webhook: z.boolean(),
    qr: z.boolean(),
    tally: z.boolean(),
    board: z.boolean(),
});
export type IntegrationsConfig = z.infer<typeof integrationsSchema>;

// Task #42's real Email/SMTP ticket delivery — non-secret relay settings
// only. The password never lives here: it goes straight to the Windows
// Credential Manager (src-tauri/src/security/mod.rs), same "never a config
// file, never the repository" split as RemoteAccessConfig's `Enabled`
// versus the tunnel token above.
const smtpSchema = z.object({
    Host: z.string(),
    Port: z.number().int().min(1).max(65535),
    Username: z.string(),
});
export type SmtpConfig = z.infer<typeof smtpSchema>;

// Outbox-worker task — real (if minimal) delivery config for the Webhook,
// Tally and Board Integrations rows, same "empty = not configured yet"
// convention as `GsmPort`/`IndicatorPort` above, and the same "non-secret
// config here, any real secret in the OS credential store" split as
// `smtpSchema`. Unlike SMTP there's no password to keep out of this schema:
// an HMAC signing secret is sent as a header value on every request, not
// used to authenticate a login, so it stays alongside the endpoint rather
// than in Windows Credential Manager.
const webhookSchema = z.object({
    /** Full URL a ticket's payload is POSTed to; empty = not configured. */
    Endpoint: z.string(),
    /** HMAC-SHA256 signing secret, sent as an X-BabuScales-Signature header; empty = send unsigned. */
    Secret: z.string(),
});
export type WebhookConfig = z.infer<typeof webhookSchema>;

// A local directory, not a live connection — "Format · folder" per
// INTEGRATION_FIXTURES' own description of this row. CSV-to-a-folder is the
// whole scope (see net::tally's own doc comment): no real Tally XML/
// proprietary accounting format is attempted.
const tallySchema = z.object({
    /** A local directory path; empty = not configured. */
    Folder: z.string(),
});
export type TallyConfig = z.infer<typeof tallySchema>;

// The outdoor display board's address — a raw TCP text-line protocol (see
// net::board's own doc comment), so there's nothing else to configure here.
const boardSchema = z.object({
    Host: z.string(),
    Port: z.number().int().min(1).max(65535),
});
export type BoardConfig = z.infer<typeof boardSchema>;

// PLAN §17's setup wizard, scoped down (app/README.md known gap) to just
// the fields a real connection needs — see settings/_private/ConnectionsPane.tsx.
const connectionsSchema = z.object({
    /** Empty = not configured yet — App.tsx's SerialConnectionSync leaves the indicator idle at a stable zero rather than attempting a connection. */
    IndicatorPort: z.string(),
    IndicatorBaud: z.number().int().positive(),
    /** A regex with one capture group around the weight — PLAN §17's "custom-pattern fallback so any indicator works without a code change" (src-tauri/src/devices/indicator.rs's `parse_weight`). Empty uses that function's built-in numeric-extraction fallback instead. */
    IndicatorPattern: z.string(),
    /** Task #43's GSM modem, on its own serial port — same "empty = not configured yet" shape as `IndicatorPort`, checked the same way before a send is attempted. */
    GsmPort: z.string(),
    GsmBaud: z.number().int().positive(),
});
export type ConnectionsConfig = z.infer<typeof connectionsSchema>;

// Task #45 — PLAN §18's "scheduled daily summary". `Time` is a plain
// "HH:MM" 24-hour string (an `<input type="time">`'s own value shape), not a
// Date — there's nothing to serialize/parse, and it compares correctly
// against `dailySummaryEmail.ts`'s `nowLocalHm()` as a plain string.
// `LastSentDate` is bookkeeping, not admin configuration: it's what guards
// against sending twice in one day (or resending on every relaunch after
// the scheduled time has already passed) — see SettingsProvider's
// `recordDailySummarySent`, the one write path to this schema that isn't
// gated by `unlocked`, same reasoning as `setOperatorName`.
const dailySummarySchema = z.object({
    Enabled: z.boolean(),
    Time: z.string(),
    Recipient: z.string(),
    LastSentDate: z.string(),
});
export type DailySummaryConfig = z.infer<typeof dailySummarySchema>;

export const settingsBodySchema = z.object({
    Rules: rulesSchema,
    Stability: stabilitySchema,
    Numbering: numberingSchema,
    Formats: formatsSchema,
    Connections: connectionsSchema,
    Printers: printersSchema,
    Integrations: integrationsSchema,
    RemoteAccess: remoteAccessSchema,
    Smtp: smtpSchema,
    Webhook: webhookSchema,
    Tally: tallySchema,
    Board: boardSchema,
    DailySummary: dailySummarySchema,
    /** "Operator on duty" (mock's `#opChip`/Appearance pane `#setOp`) — a free-text label, not an account; deliberately not admin-gated. */
    OperatorName: z.string(),
    /** Task #51 — Appearance pane's Theme picker. Neither field is admin-gated, same reasoning as `OperatorName`. */
    Skin: z.enum(SKIN_KEYS),
    TextScale: z.union([z.literal(0.9), z.literal(1), z.literal(1.12), z.literal(1.28)]),
    AdminPasswordHash: z.string(),
    AdminPasswordSalt: z.string(),
});
export type SettingsBody = z.infer<typeof settingsBodySchema>;

// The mock's own form defaults (demo/BabuScales-demo.html's `cfg`/`rules`
// objects and the Weighing pane's `#setReads`/`#setBand` input `value=`s).
export const DEFAULT_RULES: WeighingRules = {
    TareFirst: true,
    StrictTare: false,
    AutoCapture: false,
    MultiGross: false,
};

export const DEFAULT_STABILITY: StabilityGate = {
    ReadingsInRow: 5,
    BandKg: 20,
};

/** The mock's own fallback (`setOperator`: `(v || "").trim() || "Operator"`) — what an empty name reverts to. */
export const DEFAULT_OPERATOR_NAME = "Operator";

/** Mock's own `setSkin("indicator")`/`setFs(1)` startup calls, verbatim. */
export const DEFAULT_SKIN: SkinKey = "indicator";
export const DEFAULT_TEXT_SCALE: TextScale = 1;

export const DEFAULT_NUMBERING: TicketNumbering = {
    Prefix: "TKT-",
    Width: 4,
    AutoReset: false,
    ResetEvery: "year",
    ResetOn: "01 Apr",
};

export const DEFAULT_FORMATS: DisplayFormats = {
    DateFmt: "dd MMM yyyy",
    TimeFmt: "24",
    AmountDp: 2,
};

export const DEFAULT_CONNECTIONS: ConnectionsConfig = {
    IndicatorPort: "",
    IndicatorBaud: 9600,
    IndicatorPattern: "",
    GsmPort: "",
    GsmBaud: 9600,
};

/** The mock's own `cfg.prn` default, verbatim. */
export const DEFAULT_PRINTERS: PrintersConfig = {
    A4: "HP LaserJet M1005",
    Mx: "Epson LX-310",
    Th: "TVS RP 3200 Star",
};

/** Opt-in, off by default (PLAN §18's own words, verbatim). */
export const DEFAULT_REMOTE_ACCESS: RemoteAccessConfig = {
    Enabled: false,
};

/** Empty — same "not configured yet" shape as `DEFAULT_CONNECTIONS.IndicatorPort`; the password lives in the OS credential store, not here. */
export const DEFAULT_SMTP: SmtpConfig = {
    Host: "",
    Port: 587,
    Username: "",
};

/** Empty — same "not configured yet" shape as `DEFAULT_SMTP`; unsigned until a secret is set. */
export const DEFAULT_WEBHOOK: WebhookConfig = {
    Endpoint: "",
    Secret: "",
};

/** Empty — same "not configured yet" shape as `DEFAULT_CONNECTIONS.IndicatorPort`. */
export const DEFAULT_TALLY: TallyConfig = {
    Folder: "",
};

/** Empty host — same "not configured yet" shape as the other new channels above; 23 is a placeholder TCP port with no special meaning, mirroring `DEFAULT_SMTP.Port`'s own "a sane default, not a validated one" note. */
export const DEFAULT_BOARD: BoardConfig = {
    Host: "",
    Port: 23,
};

/** Off, unset recipient, never sent — same "not configured yet" shape as `DEFAULT_SMTP`, which this reuses for the relay itself. */
export const DEFAULT_DAILY_SUMMARY: DailySummaryConfig = {
    Enabled: false,
    Time: "18:00",
    Recipient: "",
    LastSentDate: "",
};

/** INTEGRATIONS' own `on:` flags, verbatim. */
export const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
    whatsapp: true,
    sms: false,
    email: true,
    backup: true,
    webhook: false,
    qr: true,
    tally: false,
    board: false,
};

/** RULE_DEFS, verbatim — the one place a one-line note earns its keep. */
export const RULE_DEFS: readonly [key: keyof WeighingRules, label: string, note: string][] = [
    [
        "TareFirst",
        "Weigh tare first",
        "Off means the loaded lorry is weighed first — a delivery coming in rather than going out.",
    ],
    [
        "StrictTare",
        "Strict tare",
        "Re-weigh the empty lorry every trip. Off lets a stored tare be pulled in from the vehicle master.",
    ],
    [
        "AutoCapture",
        "Auto-capture when stable",
        "The operator never touches the button; the reading is taken the moment it settles.",
    ],
    [
        "MultiGross",
        "Multi-gross (multiple loads per ticket)",
        "Weigh the empty lorry's tare once, then capture more than one loaded (Gross) weight under the same ticket — net is the sum of every load's own gross minus that one tare. Off keeps every ticket to the usual single tare/single gross pair.",
    ],
];

/** POLICY, verbatim — the read-only "Fixed policy" table (not a Settings control; there is nothing to toggle). */
export const FIXED_POLICY: readonly [title: string, detail: string][] = [
    [
        "Reprints are always allowed",
        "Every copy after the first is stamped DUPLICATE and counted on the audit trail.",
    ],
    [
        "A cancellation always needs a reason",
        "The row is never deleted — it stays, struck through, with the reason recorded.",
    ],
    ["Nothing is written to a file", "Every setting on this screen is a row in the database."],
];
