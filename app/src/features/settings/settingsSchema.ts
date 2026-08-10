import { z } from "zod";

// One row, one ConfigId, `ConfigKind: "Settings"` (already in `CONFIG_KINDS`
// — src/db/types.ts). Everything on this screen is a row in the database,
// same as the mock's own "Fixed policy" says it should be — see
// demo/BabuScale-demo.html's POLICY array, item 3.
export const SETTINGS_CONFIG_ID = "settings";

export const RESET_EVERY_OPTIONS = ["year", "cal", "month", "day"] as const;
export type ResetEvery = (typeof RESET_EVERY_OPTIONS)[number];

// Mock's own comment (demo/BabuScale-demo.html, just above RULE_DEFS):
// "Only three rules survive. Required-ness moved into the schema JSON;
// reprint stamping and the cancellation reason are fixed policy, not
// toggles." — those three are exactly what's here.
const rulesSchema = z.object({
    TareFirst: z.boolean(),
    StrictTare: z.boolean(),
    AutoCapture: z.boolean(),
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

// PLAN §17's setup wizard, scoped down (app/README.md known gap) to just
// the fields a real connection needs — see settings/_private/ConnectionsPane.tsx.
const connectionsSchema = z.object({
    /** Empty = not configured yet — App.tsx's SerialConnectionSync leaves the indicator idle at a stable zero rather than attempting a connection. */
    IndicatorPort: z.string(),
    IndicatorBaud: z.number().int().positive(),
    /** A regex with one capture group around the weight — PLAN §17's "custom-pattern fallback so any indicator works without a code change" (src-tauri/src/devices/indicator.rs's `parse_weight`). Empty uses that function's built-in numeric-extraction fallback instead. */
    IndicatorPattern: z.string(),
});
export type ConnectionsConfig = z.infer<typeof connectionsSchema>;

export const settingsBodySchema = z.object({
    Rules: rulesSchema,
    Stability: stabilitySchema,
    Numbering: numberingSchema,
    Formats: formatsSchema,
    Connections: connectionsSchema,
    /** "Operator on duty" (mock's `#opChip`/Appearance pane `#setOp`) — a free-text label, not an account; deliberately not admin-gated. */
    OperatorName: z.string(),
    AdminPasswordHash: z.string(),
    AdminPasswordSalt: z.string(),
});
export type SettingsBody = z.infer<typeof settingsBodySchema>;

// The mock's own form defaults (demo/BabuScale-demo.html's `cfg`/`rules`
// objects and the Weighing pane's `#setReads`/`#setBand` input `value=`s).
export const DEFAULT_RULES: WeighingRules = {
    TareFirst: true,
    StrictTare: false,
    AutoCapture: false,
};

export const DEFAULT_STABILITY: StabilityGate = {
    ReadingsInRow: 5,
    BandKg: 20,
};

/** The mock's own fallback (`setOperator`: `(v || "").trim() || "Operator"`) — what an empty name reverts to. */
export const DEFAULT_OPERATOR_NAME = "Operator";

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
