import { isStoredTareBody } from "@db/storedTare";
import type { MasterRow } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

export interface MasterFormState {
    name: string;
    weightKg: string;
    capturedAt: string;
    partyName: string;
    /** One entry per schema-declared MasterColumn, keyed by FieldId — replaces what used to be a fixed notes/rate/email/phone shape (task: "specify what all column we need for master"). Unused for StoredTare, which keeps its own weightKg/capturedAt/partyName fields above. */
    extra: Record<string, string>;
}

export const emptyForm = (): MasterFormState => ({
    name: "",
    weightKg: "",
    capturedAt: "",
    partyName: "",
    extra: {},
});

const toDateTimeLocal = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — MasterFormState plus the row<->form
// conversions. `columns` is the active kind's schema-declared Masters
// columns (Schema.Masters, App.tsx's ticketSchema) — every non-StoredTare
// kind reads its extra fields generically off `row.Body[FieldId]` now,
// rather than the old fixed notes/rate/email/phone shape.
export const formFromRow = (row: MasterRow, columns: MasterColumn[]): MasterFormState => {
    if (row.MasterKind === "StoredTare" && isStoredTareBody(row.Body)) {
        return {
            name: row.Name,
            weightKg: String(row.Body.WeightKg),
            capturedAt: toDateTimeLocal(row.Body.CapturedAt),
            partyName: row.Body.PartyName ?? "",
            extra: {},
        };
    }
    const extra: Record<string, string> = {};
    for (const column of columns) {
        const raw = row.Body[column.FieldId];
        extra[column.FieldId] =
            typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? String(raw) : "";
    }
    return { name: row.Name, weightKg: "", capturedAt: "", partyName: "", extra };
};
