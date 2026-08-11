import type { DataTableColumn } from "@components/DataTable";
import { formatMoney } from "@constants/numberFormat";
import { getMaterialRate } from "@db/materialBody";
import { isStoredTareBody, isStoredTareStale, storedTareAgeDays } from "@db/storedTare";
import type { MasterKind, MasterRow } from "@db/types";

const storedTareColumns = (styles: CSSModuleClasses): DataTableColumn<MasterRow>[] => [
    { key: "name", header: "Vehicle", render: (row) => row.Name },
    {
        key: "weight",
        header: "Weight",
        numeric: true,
        render: (row) => (isStoredTareBody(row.Body) ? `${row.Body.WeightKg} kg` : "—"),
    },
    {
        key: "age",
        header: "Age",
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
        header: "Party",
        render: (row) => (isStoredTareBody(row.Body) ? (row.Body.PartyName ?? "—") : "—"),
    },
    { key: "active", header: "Status", render: (row) => (row.IsActive ? "Active" : "Inactive") },
];

const kindSpecificColumn = (activeKind: MasterKind): DataTableColumn<MasterRow> =>
    activeKind === "Material"
        ? {
              key: "rate",
              header: "Rate / t",
              numeric: true,
              render: (row) => {
                  const rate = getMaterialRate(row.Body);
                  return rate !== null ? formatMoney(rate, 2) : "—";
              },
          }
        : activeKind === "Party"
          ? {
                key: "email",
                header: "E-mail",
                render: (row) => (typeof row.Body.Email === "string" ? row.Body.Email : "—"),
            }
          : {
                key: "notes",
                header: "Notes",
                render: (row) => (typeof row.Body.Notes === "string" ? row.Body.Notes : "—"),
            };

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the per-kind DataTable column list, unchanged
// from the inline version it replaces.
export const buildMasterColumns = (
    activeKind: MasterKind,
    styles: CSSModuleClasses,
): DataTableColumn<MasterRow>[] => {
    if (activeKind === "StoredTare") return storedTareColumns(styles);
    return [
        { key: "name", header: "Name", render: (row) => row.Name },
        kindSpecificColumn(activeKind),
        ...(activeKind === "Party"
            ? [
                  {
                      key: "phone",
                      header: "Phone",
                      render: (row: MasterRow) => (typeof row.Body.Phone === "string" ? row.Body.Phone : "—"),
                  } satisfies DataTableColumn<MasterRow>,
              ]
            : []),
        { key: "active", header: "Status", render: (row) => (row.IsActive ? "Active" : "Inactive") },
        { key: "updated", header: "Updated", render: (row) => new Date(row.UpdatedAt).toLocaleString() },
    ];
};
