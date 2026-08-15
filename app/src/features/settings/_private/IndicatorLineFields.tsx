import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import { LINE_ENDING_OPTIONS } from "../settingsSchema";
import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";

export interface IndicatorLineFieldsProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of IndicatorFramingFields (over the line budget —
// docs/CodingStandards.md) — the line-terminator + digit-reversal half of
// the wire-framing fields, kept separate from the data-bits/parity/stop-bits
// half so neither file needs to grow back over budget later.
export const IndicatorLineFields = ({ settings, conn, unlocked, onSave }: IndicatorLineFieldsProps) => {
    const { t } = useTranslation();
    return (
        <FieldGrid columns={2}>
            <Field id="connLineEnding" label={t("settings.indicator.lineEnding")}>
                <Select
                    id="connLineEnding"
                    value={conn.IndicatorLineEnding}
                    options={LINE_ENDING_OPTIONS.map((ending) => ({
                        value: ending,
                        label: t(`settings.indicator.lineEnding.${ending}`),
                    }))}
                    disabled={!unlocked}
                    onChange={(value) =>
                        onSave({
                            ...settings,
                            Connections: { ...conn, IndicatorLineEnding: value },
                        })
                    }
                />
            </Field>
            <Field id="connReverseDigits" label={t("settings.indicator.reverseDigits")}>
                <input
                    id="connReverseDigits"
                    type="checkbox"
                    checked={conn.IndicatorReverseDigits}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, Connections: { ...conn, IndicatorReverseDigits: event.target.checked } })
                    }
                />
            </Field>
        </FieldGrid>
    );
};
