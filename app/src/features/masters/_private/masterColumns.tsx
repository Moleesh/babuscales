import type { DataTableColumn } from "@components/DataTable";
import { formatDateTimeInFmt, formatMoney, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { isStoredTareBody, isStoredTareStale, storedTareAgeDays } from "@db/storedTare";
import type { MasterKind, MasterRow } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";
import type { Translate } from "@i18n/types";

import { masterColumnLabel } from "../masterKindMeta";

const storedTareColumns = (
    styles: CSSModuleClasses,
    t: Translate,
    weightUnit: WeightUnit,
    lang: string,
): DataTableColumn<MasterRow>[] => [
    { key: "name", header: t("masters.col.vehicle"), render: (row) => row.Name },
    {
        key: "weight",
        header: t("masters.col.weight"),
        numeric: true,
        render: (row) => (isStoredTareBody(row.Body) ? formatWeightIn(row.Body.WeightKg, weightUnit, lang) : "—"),
    },
    {
        key: "age",
        header: t("masters.col.age"),
        numeric: true,
        render: (row) => {
            if (!isStoredTareBody(row.Body)) return "—";
            const now = Date.now();
            const days = storedTareAgeDays(row.Body.CapturedAt, now);
            const stale = isStoredTareStale(row.Body.CapturedAt, now);
            return (
                <span className={stale ? styles.stale : undefined}>
                    {days}d{stale ? " ⚠" : ""}
                </span>
            );
        },
    },
    {
        key: "party",
        header: t("masters.col.party"),
        render: (row) => (isStoredTareBody(row.Body) ? (row.Body.PartyName ?? "—") : "—"),
    },
];

const renderColumnValue = (column: MasterColumn, raw: unknown): string => {
    if (raw === undefined || raw === null || raw === "") return "—";
    if (column.Kind === "Money") return typeof raw === "number" ? formatMoney(raw, 2) : "—";
    if (column.Kind === "Boolean") return raw === true || raw === "true" ? "✓" : "—";
    return typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? String(raw) : "—";
};

// One DataTable column per schema-declared Masters column (Schema.Masters,
// App.tsx's ticketSchema) — replaces the old fixed rate/email/phone/notes
// branches — lets you specify what all column a master needs.
const dynamicColumns = (masterColumns: MasterColumn[], lang: string, t: Translate): DataTableColumn<MasterRow>[] =>
    masterColumns.map((column) => ({
        key: column.FieldId,
        header: masterColumnLabel(column, lang, t),
        numeric: column.Kind === "Number" || column.Kind === "Money",
        render: (row) => renderColumnValue(column, row.Body[column.FieldId]),
    }));

export interface BuildMasterColumnsArgs {
    activeKind: MasterKind;
    masterColumns: MasterColumn[];
    styles: CSSModuleClasses;
    t: Translate;
    lang: string;
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the per-kind DataTable column list.
export const buildMasterColumns = ({
    activeKind,
    masterColumns,
    styles,
    t,
    lang,
    weightUnit,
    dateFmt,
    timeFmt,
}: BuildMasterColumnsArgs): DataTableColumn<MasterRow>[] => {
    if (activeKind === "StoredTare") return storedTareColumns(styles, t, weightUnit, lang);
    return [
        { key: "name", header: t("masters.col.name"), render: (row) => row.Name },
        ...dynamicColumns(masterColumns, lang, t),
        {
            key: "updated",
            header: t("masters.col.updated"),
            render: (row) => formatDateTimeInFmt(row.UpdatedAt, lang, dateFmt, timeFmt),
        },
    ];
};
