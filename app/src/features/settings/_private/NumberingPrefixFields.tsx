import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import type { TicketNumbering } from "../settingsSchema";

const clampInt = (value: string, min: number, max: number, fallback: number): number => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
};

export interface NumberingPrefixFieldsProps {
    numbering: TicketNumbering;
    unlocked: boolean;
    onChange: (next: TicketNumbering) => void;
}

// Split out of TicketNumberingCard (over the line budget — docs/CodingStandards.md)
// — the Prefix/Digits fields, unchanged from the inline version it replaces.
export const NumberingPrefixFields = ({ numbering, unlocked, onChange }: NumberingPrefixFieldsProps) => {
    const { t } = useTranslation();
    return (
    <FieldGrid columns={3}>
        <Field id="numPrefix" label={t("settings.numbering.prefix")}>
            <input
                id="numPrefix"
                value={numbering.Prefix}
                disabled={!unlocked}
                onChange={(event) => onChange({ ...numbering, Prefix: event.target.value })}
            />
        </Field>
        <Field id="numWidth" label={t("settings.numbering.digits")}>
            <input
                id="numWidth"
                type="number"
                min={3}
                max={9}
                value={numbering.Width}
                disabled={!unlocked}
                onChange={(event) =>
                    onChange({ ...numbering, Width: clampInt(event.target.value, 3, 9, numbering.Width) })
                }
            />
        </Field>
        <div />
    </FieldGrid>
    );
};
