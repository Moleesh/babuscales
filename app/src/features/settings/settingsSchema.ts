import { z } from "zod";

import { DATE_FORMATS, WEIGHT_UNITS } from "@constants/numberFormat";

// One row, one ConfigId, `ConfigKind: "Settings"` (already in `CONFIG_KINDS`
// — src/db/types.ts). Everything on this screen is a row in the database,
// same as the mock's own "Fixed policy" says it should be — see
// demo/BabuScales-demo.html's POLICY array, item 3.
export const SETTINGS_CONFIG_ID = "settings";

// Same build-time flag createIndicatorSource.ts branches on. Used only to
// pick `ShowSendLorry`'s default below — the demo/web build has no other way
// to get a weight reading at all, so it stays on; the desktop/serial build
// has real hardware, so this test aid defaults off but stays manually
// enable-able (serialIndicator.ts now implements `loadLorry` either way).
const IS_TAURI_BUILD = import.meta.env.VITE_DATA_ADAPTER === "tauri";

// Mock's own comment (demo/BabuScales-demo.html, just above RULE_DEFS):
// "Only three rules survive. Required-ness moved into the schema JSON;
// reprint stamping and the cancellation reason are fixed policy, not
// toggles." — those three are exactly what's here.
const rulesSchema = z.object({
    StrictTare: z.boolean(),
    // "Send to lorry" (ActionsCard.tsx) used to only ever appear
    // on the simulated indicator adapter, because the real serial one had no
    // `loadLorry` at all — an accidental, adapter-tied way to hide a button
    // meant for local testing/demoing. Both adapters implement `loadLorry`
    // now (see serialIndicator.ts, which layers the same settle physics over
    // its own readings), so this is purely an explicit on/off choice: on by
    // default in the demo/web build (it's the only way that build gets a
    // reading at all), off-but-manually-enable-able in the desktop/serial
    // build (`IS_TAURI_BUILD` above) where real hardware is the default
    // path. `.default()` (unlike every field above) because this field is
    // new — a settings row saved before it existed must still `safeParse`
    // successfully instead of failing whole-row and silently resetting
    // every other setting on the row (useSettingsRecord.ts's fallback to
    // `createDefaultSettingsRow`). Same reasoning on `ManualEntry`,
    // `Formats.WeightUnit` and the whole `Business` object below.
    ShowSendLorry: z.boolean().default(!IS_TAURI_BUILD),
    // Manual-entry mode — the Tare/Gross boxes on the weighing screen
    // (CalcCard.tsx) become typed number inputs instead of read-only scale
    // readouts, for a site with no connected indicator yet (or one that's
    // temporarily down). Off by default: zero behaviour change until an
    // admin opts in, same shape as every other rule here. A manual entry
    // still flows through the same `Capture` pipeline as a scale reading —
    // see useWeighingTicket's `manualCapture`, `Source: "Manual"`.
    ManualEntry: z.boolean().default(false),
    // Whether completing a ticket's second weight (the one that
    // finishes an already-saved, single-weight ticket — see
    // useTicketPersistenceActions.save in useWeighingTicket.ts) keeps that
    // ticket's own number, or gets issued a fresh one of its own while the
    // original single-weight ticket stands as its own permanent record.
    // On (default) is today's only behaviour, unchanged: one ticket number
    // covers both weights start to finish. `.default()` since it's new —
    // same "old settings row still parses" reasoning as ShowSendLorry/
    // ManualEntry above.
    SameTicketNo: z.boolean().default(true),
    // Task: "add the formula shown below fields plus a toggle to hide them"
    // — the "Label = formula = substituted = result" line CalcCard.tsx
    // renders under the fixed Net box (netFormulaBreakdown) and under every
    // schema-driven Formula field (CalcSegmentRows, calcSegments.ts). On
    // (default) keeps today's always-shown behaviour unchanged for existing
    // installs; an admin who finds the extra line noisy on a small screen
    // can turn it off. `.default()` — same "old settings row still parses"
    // reasoning as ShowSendLorry/ManualEntry/SameTicketNo above.
    ShowFormulaBreakdown: z.boolean().default(true),
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
    // Which `SeriesEpoch` (db/types.ts's DocRow) Reports treats as "current"
    // — bumped to match `resetDocSeries`'s returned `Epoch` whenever "Reset
    // the counter now" runs (App.tsx's resetTicketSeries,
    // TicketAndDateTimeCard.tsx's handleReset). Tickets saved under any
    // other epoch are "backed" data: kept forever, just hidden from Reports'
    // default view (reportRows.ts's filterRowsBySeries). `.default(1)` —
    // same "old settings row still parses" reasoning as ShowSendLorry/
    // ManualEntry/SameTicketNo above — a settings row saved before this
    // field existed defaults to epoch 1, which matches every ticket's own
    // default `SeriesEpoch` (db/types.ts) until the first reset ever runs.
    CurrentEpoch: z.number().int().min(1).default(1),
});
export type TicketNumbering = z.infer<typeof numberingSchema>;

const formatsSchema = z.object({
    DateFmt: z.enum(DATE_FORMATS),
    TimeFmt: z.enum(["24", "12"]),
    AmountDp: z.union([z.literal(0), z.literal(2)]),
    /** Dashboard/report weight display — Indian sites read kg, not tonnes;
     * the indicator itself always reports kg regardless of
     * this. See constants/numberFormat.ts's `formatWeightIn`. */
    WeightUnit: z.enum(WEIGHT_UNITS).default("kg"),
});
export type DisplayFormats = z.infer<typeof formatsSchema>;

export const BAUD_RATE_OPTIONS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

/** Options for the framing `Select`s (IndicatorFramingFields.tsx) — every
 * value serialport (the Rust crate) actually supports, nothing more. */
export const DATA_BITS_OPTIONS = [5, 6, 7, 8] as const;
export const STOP_BITS_OPTIONS = [1, 2] as const;
export const PARITY_OPTIONS = ["none", "odd", "even"] as const;

// demo/BabuScales-demo.html's PRINTERS fixture, verbatim. The browser print
// dialog (window.print(), engines/print) always lets the operator pick the
// real target printer themselves, on both the demo and the desktop build —
// so this list stays a stated *preference* (which detected printer plays
// the "A4"/"Mx"/"Th" role), not a live binding, same as the mock. Real
// driver-level enumeration (@engines/printers, PrintPane.tsx's
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
    // WhatsApp stays decorative by decision, not oversight, and
    // unlike every other still-decorative row here it never will get a real
    // worker: WhatsApp only has two paths in, and neither is a fit. (1) Meta's
    // official Cloud API needs a paid, Meta-approved business account and a
    // per-message cost — the only per-message cost
    // left once SMS sidestepped it via a
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

// Its own separate "Remote access — Cloudflare Tunnel" spec — not
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

// Appearance pane's `SKINS` array (demo/BabuScales-demo.html),
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

// Real Email/SMTP ticket delivery — non-secret relay settings
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

// The setup wizard, scoped down (app/README.md known gap) to just
// the fields a real connection needs — see settings/_private/ConnectionsPane.tsx.
const connectionsSchema = z.object({
    /** Empty = not configured yet — App.tsx's SerialConnectionSync leaves the indicator idle at a stable zero rather than attempting a connection. */
    IndicatorPort: z.string(),
    IndicatorBaud: z.number().int().positive(),
    /** A regex with one capture group around the weight — a custom-pattern fallback so any indicator works without a code change (src-tauri/src/devices/indicator.rs's `parse_weight`). Empty uses that function's built-in numeric-extraction fallback instead. */
    IndicatorPattern: z.string(),
    /** Wire framing — for capturing which settings the indicator uses;
     * previously hardcoded on the Rust side to
     * 8-N-1/LF/not-reversed with no way to change any of it. Mirrors
     * src-tauri/src/devices/indicator.rs's `IndicatorFraming` field-for-field
     * (its `#[serde(rename_all = "PascalCase")]` is what makes the
     * `IndicatorDataBits: 8 -> DataBits: 8` mapping in
     * serialIndicator.ts/useIndicatorPortMonitor.ts a straight rename, not
     * a reshape). */
    IndicatorDataBits: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8)]),
    IndicatorParity: z.enum(["none", "odd", "even"]),
    IndicatorStopBits: z.union([z.literal(1), z.literal(2)]),
    /** The line terminator's raw decimal byte value (10 = LF, 13 = CR) —
     * a plain number field, not an LF/CR/CRLF picker. See
     * src-tauri/src/devices/indicator.rs's `IndicatorFraming.line_ending`. */
    IndicatorLineEndingByte: z.number().int().min(0).max(255),
    /** Some indicators send a weight's digits least-significant-first. */
    IndicatorReverseDigits: z.boolean(),
    /** Simpler alternative to `IndicatorPattern` — bounds each line to
     * between these two single characters before the built-in digit
     * extraction runs, instead of writing a regex. Empty = not bounded on
     * that side. Ignored once `IndicatorPattern` is set. */
    IndicatorStartChar: z.string().max(1),
    IndicatorEndChar: z.string().max(1),
    /** The GSM modem, on its own serial port — same "empty = not configured yet" shape as `IndicatorPort`, checked the same way before a send is attempted. */
    GsmPort: z.string(),
    GsmBaud: z.number().int().positive(),
});
export type ConnectionsConfig = z.infer<typeof connectionsSchema>;

// The "scheduled daily summary". `Time` is a plain
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

/** Settings' new default-open "Business" pane — the name/address/phone that
 * used to be a hardcoded string in App.tsx's `siteLabel` prop. */
const businessSchema = z.object({
    Name: z.string(),
    Address: z.string(),
    Phone: z.string(),
});
export type BusinessInfo = z.infer<typeof businessSchema>;

/** The exact string App.tsx's `siteLabel` prop hardcoded before the
 * Business pane existed — same real-world default, now editable. Declared
 * here (rather than after `settingsBodySchema`) so `businessSchema`'s own
 * `.default()` below can reference it. */
const DEFAULT_BUSINESS_VALUE: BusinessInfo = {
    Name: "Babulens Enterprise",
    Address: "Nagercoil",
    Phone: "9789597007",
};

export const settingsBodySchema = z.object({
    Business: businessSchema.default(DEFAULT_BUSINESS_VALUE),
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
    /** Appearance pane's Theme picker. Neither field is admin-gated, same reasoning as `OperatorName`. */
    Skin: z.enum(SKIN_KEYS),
    TextScale: z.union([z.literal(0.9), z.literal(1), z.literal(1.12), z.literal(1.28)]),
    AdminPasswordHash: z.string(),
    AdminPasswordSalt: z.string(),
});
export type SettingsBody = z.infer<typeof settingsBodySchema>;

export const DEFAULT_BUSINESS: BusinessInfo = DEFAULT_BUSINESS_VALUE;

// The mock's own form defaults (demo/BabuScales-demo.html's `cfg`/`rules`
// objects and the Weighing pane's `#setReads`/`#setBand` input `value=`s).
export const DEFAULT_RULES: WeighingRules = {
    StrictTare: false,
    ShowSendLorry: !IS_TAURI_BUILD,
    ManualEntry: false,
    SameTicketNo: true,
    ShowFormulaBreakdown: true,
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
    CurrentEpoch: 1,
};

export const DEFAULT_FORMATS: DisplayFormats = {
    DateFmt: "dd MMM yyyy",
    TimeFmt: "24",
    AmountDp: 2,
    /** "In india we use kg instead of ton" — kg is the
     * out-of-the-box default, tonnes is opt-in. */
    WeightUnit: "kg",
};

export const DEFAULT_CONNECTIONS: ConnectionsConfig = {
    IndicatorPort: "",
    IndicatorBaud: 9600,
    IndicatorPattern: "",
    // 8-N-1/LF/not-reversed — the industry-standard default most
    // weighbridge indicators ship with, and what the Rust side always used
    // before these became configurable.
    IndicatorDataBits: 8,
    IndicatorParity: "none",
    IndicatorStopBits: 1,
    IndicatorLineEndingByte: 10,
    IndicatorReverseDigits: false,
    IndicatorStartChar: "",
    IndicatorEndChar: "",
    GsmPort: "",
    GsmBaud: 9600,
};

/** The mock's own `cfg.prn` default, verbatim. */
export const DEFAULT_PRINTERS: PrintersConfig = {
    A4: "HP LaserJet M1005",
    Mx: "Epson LX-310",
    Th: "TVS RP 3200 Star",
};

/** Opt-in, off by default. */
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

/** Was a plain RULE_DEFS constant — now `t`-threaded (mirrors reportRows.ts's viewOptions(t) precedent) so label/note re-render on language change. */
export const ruleDefs = (t: (key: string) => string): readonly [key: keyof WeighingRules, label: string, note: string][] => [
    ["StrictTare", t("settings.weighingRules.strictTare.label"), t("settings.weighingRules.strictTare.note")],
    [
        "SameTicketNo",
        t("settings.weighingRules.sameTicketNo.label"),
        t("settings.weighingRules.sameTicketNo.note"),
    ],
    [
        "ShowSendLorry",
        t("settings.weighingRules.showSendLorry.label"),
        t("settings.weighingRules.showSendLorry.note"),
    ],
    [
        "ManualEntry",
        t("settings.weighingRules.manualEntry.label"),
        t("settings.weighingRules.manualEntry.note"),
    ],
    [
        "ShowFormulaBreakdown",
        t("settings.weighingRules.showFormulaBreakdown.label"),
        t("settings.weighingRules.showFormulaBreakdown.note"),
    ],
];
