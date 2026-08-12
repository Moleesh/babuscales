import { Field, FieldGrid } from "@components/Field";
import type { MasterKind } from "@db/types";
import { useTranslation } from "@i18n/useTranslation";

import type { MasterFormState } from "./masterFormState";

export interface MasterFormFieldsProps {
    activeKind: MasterKind;
    form: MasterFormState;
    onChange: (next: MasterFormState) => void;
}

const gridColumns = (activeKind: MasterKind): 2 | 3 | 4 =>
    activeKind === "Party" ? 4 : activeKind === "Material" ? 3 : 2;

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the Name/Notes/Rate/E-mail/Phone add/edit
// fields shared by every kind except Stored Tare, unchanged from the
// inline version it replaces.
export const MasterFormFields = ({ activeKind, form, onChange }: MasterFormFieldsProps) => {
    const { t } = useTranslation();
    return (
        <FieldGrid columns={gridColumns(activeKind)}>
            <Field id="mfName" label={{ en: t("masters.field.name") }}>
                <input
                    id="mfName"
                    value={form.name}
                    onChange={(event) => onChange({ ...form, name: event.target.value })}
                    autoComplete="off"
                />
            </Field>
            <Field id="mfNotes" label={{ en: t("masters.field.notes") }}>
                <input
                    id="mfNotes"
                    value={form.notes}
                    onChange={(event) => onChange({ ...form, notes: event.target.value })}
                    autoComplete="off"
                />
            </Field>
            {activeKind === "Material" && (
                <Field id="mfRate" label={{ en: t("masters.field.rate") }}>
                    <input
                        id="mfRate"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={form.rate}
                        onChange={(event) => onChange({ ...form, rate: event.target.value })}
                    />
                </Field>
            )}
            {activeKind === "Party" && (
                // Task #42 — read at print time so "Send a copy by e-mail" has
                // somewhere to send to. Optional: an empty Masters record just
                // means that party's tickets never enqueue an Email outbox
                // row, same as no phone number means no SMS.
                <Field id="mfEmail" label={{ en: t("masters.field.email") }}>
                    <input
                        id="mfEmail"
                        type="email"
                        value={form.email}
                        onChange={(event) => onChange({ ...form, email: event.target.value })}
                        autoComplete="off"
                    />
                </Field>
            )}
            {activeKind === "Party" && (
                // Task #43 — read at print time so "Send a copy by SMS" has
                // somewhere to send to. Optional, same "skip quietly" shape as
                // an empty E-mail above.
                <Field id="mfPhone" label={{ en: t("masters.field.phone") }}>
                    <input
                        id="mfPhone"
                        type="tel"
                        value={form.phone}
                        onChange={(event) => onChange({ ...form, phone: event.target.value })}
                        autoComplete="off"
                    />
                </Field>
            )}
        </FieldGrid>
    );
};
