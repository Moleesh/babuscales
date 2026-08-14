import type { DataTableColumn } from "@components/DataTable";
import { formatDateTimeInFmt, formatMoney, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { getMaterialRate } from "@db/materialBody";
import { isStoredTareBody, isStoredTareStale, storedTareAgeDays } from "@db/storedTare";
import type { MasterKind, MasterRow } from "@db/types";

/** Same shape as useTranslation()'s `t` — threaded in as a param since this is a plain helper, not a component. */
type Translate = (key: string) => string;

const storedTareColumns = (
    styles: CSSModuleClasses,
    t: Translate,
    weightUnit: WeightUnit,
): DataTableColumn<MasterRow>[] => [
    { key: "name", header: t("masters.col.vehicle"), render: (row) => row.Name },
    {
        key: "weight",
        header: t("masters.col.weight"),
        numeric: true,
        render: (row) => (isStoredTareBody(row.Body) ? formatWeightIn(row.Body.WeightKg, weightUnit) : "—"),
    },
    {
        key: "age",
        header: t("masters.col.age"),
        numeric: true,
        render: (row) => {
            if (!isStoredTareBody(row.Body)) return "—";
            const days = storedTareAgeDays(row.Body.CapturedAt);
            const stale = isStoredTareStale(row.Body.CapturedAt);
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
    {
        key: "active",
        header: t("masters.col.status"),
        render: (row) => (row.IsActive ? t("masters.status.active") : t("masters.status.inactive")),
    },
];

const kindSpecificColumn = (activeKind: MasterKind, t: Translate): DataTableColumn<MasterRow> =>
    activeKind === "Material"
        ? {
              key: "rate",
              header: t("masters.col.rate"),
              numeric: true,
              render: (row) => {
                  const rate = getMaterialRate(row.Body);
                  return rate !== null ? formatMoney(rate, 2) : "—";
              },
          }
        : activeKind === "Party"
          ? {
                key: "email",
                header: t("masters.col.email"),
                render: (row) => (typeof row.Body.Email === "string" ? row.Body.Email : "—"),
            }
          : {
                key: "notes",
                header: t("masters.col.notes"),
                render: (row) => (typeof row.Body.Notes === "string" ? row.Body.Notes : "—"),
            };

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the per-kind DataTable column list, unchanged
// from the inline version it replaces.
export const buildMasterColumns = (
    activeKind: MasterKind,
    styles: CSSModuleClasses,
    t: Translate,
    lang: string,
    weightUnit: WeightUnit,
    dateFmt: string,
    timeFmt: "24" | "12",
): DataTableColumn<MasterRow>[] => {
    if (activeKind === "StoredTare") return storedTareColumns(styles, t, weightUnit);
    return [
        { key: "name", header: t("masters.col.name"), render: (row) => row.Name },
        kindSpecificColumn(activeKind, t),
        ...(activeKind === "Party"
            ? [
                  {
                      key: "phone",
                      header: t("masters.col.phone"),
                      render: (row: MasterRow) => (typeof row.Body.Phone === "string" ? row.Body.Phone : "—"),
                  } satisfies DataTableColumn<MasterRow>,
              ]
            : []),
        {
            key: "active",
            header: t("masters.col.status"),
            render: (row) => (row.IsActive ? t("masters.status.active") : t("masters.status.inactive")),
        },
        {
            key: "updated",
            header: t("masters.col.updated"),
            render: (row) => formatDateTimeInFmt(row.UpdatedAt, lang, dateFmt, timeFmt),
        },
    ];
};
