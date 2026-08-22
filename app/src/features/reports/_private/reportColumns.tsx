import { Button } from "@components/Button";
import type { DataTableColumn } from "@components/DataTable";
import { formatDateTimeInFmt, formatMoney, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { parseTicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";
import { FIELD_LABEL_KEYS, getAllFields, resolveFieldIdLabel } from "@engines/schemaEngine";
import type { FieldBase, Schema } from "@engines/schemaEngine";
import { formatTicketNo } from "@features/weighing";

import { fieldColumnKey, groupLabel } from "../reportRows";
import type { GroupKey, SummaryRow, TicketRow, Translate } from "../reportRows";

const formatWeightCell = (kg: number | null, weightUnit: WeightUnit): string =>
    kg === null ? "—" : formatWeightIn(kg, weightUnit);

// Reports rework, item 5 — the schema Fields that can become a *report*
// column: everything except the 9 built-ins already covered by their own
// fixed columns above (`FIELD_LABEL_KEYS`, fieldLabelKeys.ts, is the same
// list Weighing itself treats as "already has a dedicated app-chrome
// label"), and only currently-visible ones — a Field an admin hid via
// FieldSchemaCard's Hide/Show toggle shouldn't resurface as a pickable
// report column either. Shared by ReportBuilderColumns.tsx (the picker) and
// useReportsScreenController.ts (the rendered table), so both always agree
// on exactly which fields are eligible.
export const reportableSchemaFields = (schema: Schema): FieldBase[] =>
    getAllFields(schema).filter((field) => !FIELD_LABEL_KEYS[field.FieldId] && field.Visible !== false);

export interface BuildTicketColumnsArgs {
    onOpenTicket: (doc: DocRow) => void;
    amountDp: 0 | 2;
    /** Settings' `Formats.WeightUnit` — the Tare/Gross/Net columns display in it. */
    weightUnit: WeightUnit;
    styles: CSSModuleClasses;
    t: Translate;
    /** i18n's active language — decides the locale the "at" column's
     * timestamp renders in (@constants/numberFormat's formatDateTimeInFmt). */
    lang: string;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — the "at" column renders in them. */
    dateFmt: string;
    timeFmt: "24" | "12";
    /** Report-builder wizard MVP — `null`
     * (the default) shows every column, same as before the wizard existed.
     * A non-null list restricts the table to just those keys plus the
     * always-shown trailing "action" column. `string`, not `TicketColumnKey`
     * — reports rework item 5: a custom schema field's column key is
     * `fieldColumnKey(FieldId)` (reportRows.ts), which isn't one of the
     * fixed built-in keys. */
    visibleColumnKeys?: string[] | null;
    /** Reports rework, item 5 — the ticket schema's own custom fields (not
     * the 9 built-ins already covered by the fixed columns above), so a
     * report can render one column per selected Field, pulling its value
     * off `doc.Body`'s `CustomFields` (db/ticketBody.ts) the same way
     * Weighing itself reads/writes them. `undefined`/empty — no dynamic
     * columns are added (e.g. callers that don't have a schema handy, like
     * unit tests exercising the fixed columns alone). */
    schemaFields?: FieldBase[];
}

const renderStatusCell = (row: TicketRow, styles: CSSModuleClasses, t: Translate) =>
    row.isCancelled ? (
        <span className={styles.cancelled}>{t("reports.status.cancelled")}</span>
    ) : row.isOpen ? (
        <span className={styles.waiting}>{t("reports.status.waiting")}</span>
    ) : (
        t("reports.status.complete")
    );

// Reports rework, item 5 — "Reprint" removed from every ticket row here;
// reprinting now only lives on the Weighing screen. Resume (for a still-open
// ticket) is kept — it's a different action, not a reprint.
const renderActionCell = (row: TicketRow, onOpenTicket: (doc: DocRow) => void, t: Translate) =>
    row.isCancelled || !row.isOpen ? null : (
        <Button onClick={() => onOpenTicket(row.doc)}>{t("reports.action.resume")}</Button>
    );

/** A custom field's stored value (db/ticketBody.ts's `CustomFields`) is
 * `string | number | boolean | null` — same em-dash-for-missing convention
 * as every other cell here (formatWeightCell above, the charge column
 * below); `boolean` doesn't have an established Reports-table rendering
 * elsewhere, so it just prints as the field's own raw string form. */
const renderFieldCell = (row: TicketRow, fieldId: string): string => {
    const value = parseTicketBody(row.doc.Body).CustomFields?.[fieldId];
    return value === undefined || value === null || value === "" ? "—" : String(value);
};

// Reports rework, item 5 — one DataTableColumn per selected custom schema
// Field, keyed `fieldColumnKey(FieldId)` (reportRows.ts) so it can never
// collide with the fixed built-in keys below. Split out of
// buildAllTicketColumns purely to stay under the file's own line budget.
const buildFieldColumns = (
    schemaFields: FieldBase[] | undefined,
    t: Translate,
): DataTableColumn<TicketRow>[] =>
    (schemaFields ?? []).map((field) => ({
        key: fieldColumnKey(field.FieldId),
        header: resolveFieldIdLabel(field.FieldId, t),
        render: (row: TicketRow) => renderFieldCell(row, field.FieldId),
    }));

// Split out of buildTicketColumns (over the line/complexity budget —
// docs/CodingStandards.md) — the full, unfiltered column list, unchanged
// from the inline version it replaces except for the dynamic field columns
// spliced in just before "action" (item 5).
const buildAllTicketColumns = ({
    onOpenTicket,
    amountDp,
    weightUnit,
    styles,
    t,
    lang,
    dateFmt,
    timeFmt,
    schemaFields,
}: BuildTicketColumnsArgs): DataTableColumn<TicketRow>[] => [
    {
        key: "no",
        header: t("reports.col.ticket"),
        render: (row) => <span className="num">{formatTicketNo(row.docSeq)}</span>,
    },
    { key: "veh", header: t("reports.col.vehicle"), render: (row) => row.vehicleNo || "—" },
    { key: "party", header: t("reports.col.party"), render: (row) => row.party || "—" },
    { key: "mat", header: t("reports.col.material"), render: (row) => row.material || "—" },
    {
        key: "tare",
        header: t("reports.col.tare"),
        numeric: true,
        render: (row) => formatWeightCell(row.tareKg, weightUnit),
    },
    {
        key: "gross",
        header: t("reports.col.gross"),
        numeric: true,
        render: (row) => formatWeightCell(row.grossKg, weightUnit),
    },
    {
        key: "net",
        header: t("reports.col.net"),
        numeric: true,
        render: (row) => formatWeightCell(row.netKg, weightUnit),
    },
    {
        key: "charge",
        header: t("reports.col.charge"),
        numeric: true,
        render: (row) => (row.charge === null ? "—" : formatMoney(row.charge, amountDp)),
    },
    {
        key: "at",
        header: t("reports.col.at"),
        render: (row) => formatDateTimeInFmt(row.at, lang, dateFmt, timeFmt),
    },
    {
        key: "status",
        header: t("reports.col.status"),
        render: (row) => renderStatusCell(row, styles, t),
    },
    ...buildFieldColumns(schemaFields, t),
    { key: "action", header: "", render: (row) => renderActionCell(row, onOpenTicket, t) },
];

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Tickets-view DataTable columns.
// `visibleColumnKeys` (set by the report-builder
// wizard) filters the list down; `null` (the default) keeps every column,
// same as before the wizard existed.
// Reports rework, item 5 — "i have godown fields selected by the report not
// showing them". Used to be a fixed built-in key set only (no/veh/party/
// mat/tare/gross/net/charge/at/status/action) with no dynamic schema-Field
// wiring at all — a picked custom field's column key never matched anything
// in `all`, so it silently vanished. `buildAllTicketColumns` now appends one
// column per `schemaFields` entry (`fieldColumnKey(FieldId)`, above), and
// this filter is generic over string keys, so a selected field column
// passes through the same `keys.includes(column.key)` check as any built-in
// one — no special-casing needed here. The "gracefully drop anything no
// longer recognized" behaviour this filter already had (a key with no
// matching column just silently disappears) now doubles as the fix for a
// field removed from the schema entirely: `schemaFields` (threaded from
// `useSchema()`, see useReportsScreenController.ts) always reflects the
// *current* schema, so a saved report naming a since-deleted field's column
// just drops it instead of crashing on missing data — same as a Field's
// Hide/Show toggle (FieldSchemaCard.tsx) simply excluding it from
// `schemaFields` in the first place.
export const buildTicketColumns = (args: BuildTicketColumnsArgs): DataTableColumn<TicketRow>[] => {
    const all = buildAllTicketColumns(args);
    const { visibleColumnKeys = null } = args;
    if (!visibleColumnKeys) return all;
    const keys: string[] = visibleColumnKeys;
    return all.filter((column) => column.key === "action" || keys.includes(column.key));
};

export interface BuildSummaryColumnsArgs {
    groupBy: GroupKey;
    amountDp: 0 | 2;
    t: Translate;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Summary-view DataTable columns,
// unchanged from the inline version it replaces.
export const buildSummaryColumns = ({
    groupBy,
    amountDp,
    t,
}: BuildSummaryColumnsArgs): DataTableColumn<SummaryRow>[] => [
    { key: "key", header: groupLabel(groupBy, t), render: (row) => row.key },
    {
        key: "count",
        header: t("reports.col.tickets"),
        numeric: true,
        render: (row) => <span className="num">{row.ticketCount}</span>,
    },
    {
        key: "tonnes",
        header: t("reports.col.netTonnes"),
        numeric: true,
        render: (row) => <span className="num">{row.netTonnes.toFixed(2)}</span>,
    },
    {
        key: "charge",
        header: t("reports.col.charge"),
        numeric: true,
        render: (row) => <span className="num">{formatMoney(row.charge, amountDp)}</span>,
    },
];
