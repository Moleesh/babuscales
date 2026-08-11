import { Field, FieldGrid } from "@components/Field";

import type { MasterFormState } from "./masterFormState";

export interface StoredTareFormFieldsProps {
    form: MasterFormState;
    onChange: (next: MasterFormState) => void;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Stored Tare add/edit fields, unchanged
// from the inline version it replaces.
export const StoredTareFormFields = ({ form, onChange }: StoredTareFormFieldsProps) => (
    <FieldGrid columns={2}>
        <Field id="mfName" label={{ en: "Vehicle No" }}>
            <input
                id="mfName"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                autoComplete="off"
            />
        </Field>
        <Field id="mfWeight" label={{ en: "Weight (kg)" }}>
            <input
                id="mfWeight"
                type="number"
                inputMode="numeric"
                value={form.weightKg}
                onChange={(event) => onChange({ ...form, weightKg: event.target.value })}
            />
        </Field>
        <Field id="mfCaptured" label={{ en: "Captured at" }}>
            <input
                id="mfCaptured"
                type="datetime-local"
                value={form.capturedAt}
                onChange={(event) => onChange({ ...form, capturedAt: event.target.value })}
            />
        </Field>
        <Field id="mfParty" label={{ en: "Party" }}>
            <input
                id="mfParty"
                value={form.partyName}
                onChange={(event) => onChange({ ...form, partyName: event.target.value })}
                autoComplete="off"
            />
        </Field>
    </FieldGrid>
);
