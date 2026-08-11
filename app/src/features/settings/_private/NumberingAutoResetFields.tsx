import { Field, FieldGrid } from "@components/Field";

import { RESET_EVERY_OPTIONS } from "../settingsSchema";
import type { ResetEvery, TicketNumbering } from "../settingsSchema";
import styles from "./SystemPane.module.css";

const RESET_EVERY_LABEL: Record<ResetEvery, string> = {
    year: "Financial year",
    cal: "Calendar year",
    month: "Month",
    day: "Day",
};

export interface NumberingAutoResetFieldsProps {
    numbering: TicketNumbering;
    unlocked: boolean;
    onChange: (next: TicketNumbering) => void;
}

// Split out of TicketNumberingCard (over the line budget — docs/CodingStandards.md)
// — the "Also reset automatically" checkbox and its Every/Starting fields,
// unchanged from the inline version it replaces.
export const NumberingAutoResetFields = ({
    numbering,
    unlocked,
    onChange,
}: NumberingAutoResetFieldsProps) => (
    <>
        <label className={styles.ck}>
            <input
                type="checkbox"
                checked={numbering.AutoReset}
                disabled={!unlocked}
                onChange={(event) => onChange({ ...numbering, AutoReset: event.target.checked })}
            />
            <span>Also reset automatically</span>
        </label>
        {numbering.AutoReset && (
            <FieldGrid columns={2}>
                <Field id="resetEvery" label={{ en: "Every" }}>
                    <select
                        id="resetEvery"
                        value={numbering.ResetEvery}
                        disabled={!unlocked}
                        onChange={(event) =>
                            onChange({ ...numbering, ResetEvery: event.target.value as ResetEvery })
                        }
                    >
                        {RESET_EVERY_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                                {RESET_EVERY_LABEL[value]}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field id="resetOn" label={{ en: "Starting" }}>
                    <input
                        id="resetOn"
                        value={numbering.ResetOn}
                        disabled={!unlocked}
                        onChange={(event) => onChange({ ...numbering, ResetOn: event.target.value })}
                    />
                </Field>
            </FieldGrid>
        )}
    </>
);
