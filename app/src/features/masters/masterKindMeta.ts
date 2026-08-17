import type { SegmentedOption } from "@components/SegmentedControl";
import { MASTER_KINDS } from "@db/types";
import type { MasterKind } from "@db/types";
import type { MasterColumn, Schema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import type { Localized } from "@i18n/types";

export interface MasterKindMeta {
    Kind: MasterKind;
    Label: Localized;
    SearchPlaceholder: Localized;
    AddNewLabel: Localized;
}

// "One screen for everything saved". Order matches the documented
// order (Parties · Materials · Vehicles · Vehicle Types ·
// Transporters · Places · Operators · Stored Tares).
export const MASTER_KIND_ORDER: MasterKind[] = [...MASTER_KINDS];

// Same "only what the active schema actually declares" rule as the
// Weighing screen's own fields (CalcCard.tsx/TicketFieldsCard.tsx) — a kind
// only gets a tab when the schema's own `Masters` block lists it. An empty
// or missing `Masters` block means zero tabs, full stop — a Search field
// referencing a kind isn't enough on its own; the schema has to actually
// configure that kind's columns to claim it.
export const visibleMasterKinds = (schema: Schema): MasterKind[] => {
    const declared = new Set<MasterKind>((schema.Masters ?? []).map((entry) => entry.Kind));
    return MASTER_KIND_ORDER.filter((kind) => declared.has(kind));
};

export const MASTER_KIND_META: Record<MasterKind, MasterKindMeta> = {
    Party: {
        Kind: "Party",
        Label: { en: "Parties" },
        SearchPlaceholder: { en: "Search parties…" },
        AddNewLabel: { en: "Add party" },
    },
    Material: {
        Kind: "Material",
        Label: { en: "Materials" },
        SearchPlaceholder: { en: "Search materials…" },
        AddNewLabel: { en: "Add material" },
    },
    Vehicle: {
        Kind: "Vehicle",
        Label: { en: "Vehicles" },
        SearchPlaceholder: { en: "Search vehicles…" },
        AddNewLabel: { en: "Add vehicle" },
    },
    VehicleType: {
        Kind: "VehicleType",
        Label: { en: "Vehicle types" },
        SearchPlaceholder: { en: "Search vehicle types…" },
        AddNewLabel: { en: "Add vehicle type" },
    },
    Transporter: {
        Kind: "Transporter",
        Label: { en: "Transporters" },
        SearchPlaceholder: { en: "Search transporters…" },
        AddNewLabel: { en: "Add transporter" },
    },
    Place: {
        Kind: "Place",
        Label: { en: "Places" },
        SearchPlaceholder: { en: "Search places…" },
        AddNewLabel: { en: "Add place" },
    },
    Operator: {
        Kind: "Operator",
        Label: { en: "Operators" },
        SearchPlaceholder: { en: "Search operators…" },
        AddNewLabel: { en: "Add operator" },
    },
    StoredTare: {
        Kind: "StoredTare",
        Label: { en: "Stored tares" },
        SearchPlaceholder: { en: "Search by vehicle…" },
        AddNewLabel: { en: "Add stored tare" },
    },
};

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the MASTER_KIND_ORDER -> SegmentedOption[]
// mapping for the kind switcher. Now uses the t() function to resolve
// labels at runtime from the active language pack.
/** Same shape as useTranslation()'s `t` — threaded in as a param since this is a plain helper, not a component. */
type Translate = (key: string) => string;

export const buildKindOptions = (
    _lang: string,
    t: Translate,
    kinds: MasterKind[] = MASTER_KIND_ORDER,
): SegmentedOption<MasterKind>[] =>
    kinds.map((kind) => ({
        value: kind,
        // i18n keys keep the kind's own camelCase ("masters.vehicleType.label",
        // "masters.storedTare.label") — lowercasing the whole kind broke the
        // multi-word ones (`vehicletype`/`storedtare` don't exist as keys),
        // showing the raw key instead of a label.
        label: t(`masters.${kind.charAt(0).toLowerCase()}${kind.slice(1)}.label`),
    }));

// The built-in `Masters` columns (defaultTicketSchema.ts's Rate/Email/Phone/
// Notes) carry no `Label` of their own — same "resolve from this app's own
// i18n strings by FieldId" shape as schemaEngine's `FIELD_LABEL_KEYS`, kept
// here instead since only the Masters screen needs it. A genuinely custom
// column an admin adds via schema upload supplies its own `Label` and never
// hits this fallback.
const MASTER_COLUMN_LABEL_KEYS: Partial<Record<string, string>> = {
    Rate: "masters.field.rate",
    Email: "masters.field.email",
    Phone: "masters.field.phone",
    Notes: "masters.field.notes",
};

export const masterColumnLabel = (column: MasterColumn, lang: string, t: Translate): string =>
    column.Label ? resolveLocalized(column.Label, lang) : t(MASTER_COLUMN_LABEL_KEYS[column.FieldId] ?? column.FieldId);
