import { getMaterialRate } from "@db/materialBody";
import { isStoredTareBody } from "@db/storedTare";
import type { MasterRow } from "@db/types";

export interface MasterFormState {
    name: string;
    notes: string;
    weightKg: string;
    capturedAt: string;
    partyName: string;
    rate: string;
    email: string;
    phone: string;
}

export const emptyForm = (): MasterFormState => ({
    name: "",
    notes: "",
    weightKg: "",
    capturedAt: "",
    partyName: "",
    rate: "",
    email: "",
    phone: "",
});

const toDateTimeLocal = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — MasterFormState plus the row<->form
// conversions, unchanged from the inline version it replaces.
export const formFromRow = (row: MasterRow): MasterFormState => {
    if (row.MasterKind === "StoredTare" && isStoredTareBody(row.Body)) {
        return {
            name: row.Name,
            notes: "",
            weightKg: String(row.Body.WeightKg),
            capturedAt: toDateTimeLocal(row.Body.CapturedAt),
            partyName: row.Body.PartyName ?? "",
            rate: "",
            email: "",
            phone: "",
        };
    }
    const rate = getMaterialRate(row.Body);
    return {
        name: row.Name,
        notes: typeof row.Body.Notes === "string" ? row.Body.Notes : "",
        weightKg: "",
        capturedAt: "",
        partyName: "",
        rate: rate !== null ? String(rate) : "",
        email: typeof row.Body.Email === "string" ? row.Body.Email : "",
        phone: typeof row.Body.Phone === "string" ? row.Body.Phone : "",
    };
};
