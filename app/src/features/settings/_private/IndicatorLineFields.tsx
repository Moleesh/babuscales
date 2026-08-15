import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import { DEFAULT_CONNECTIONS, LINE_ENDING_OPTIONS } from "../settingsSchema";
import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";
import connStyles from "./_styles/ConnectionsPane.module.css";

export interface IndicatorLineFieldsProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of IndicatorFramingFields (over the line budget —
// docs/CodingStandards.md) — line ending, the start/end-char extraction
// shortcut, and digit-reversal, kept separate from the data-bits/parity/
// stop-bits half so neither file needs to grow back over budget later.
export const IndicatorLineFields = ({ settings, conn, unlocked, onSave }: IndicatorLineFieldsProps) => {
    const { t } = useTranslation();
    const save = (patch: Partial<ConnectionsConfig>) =>
        onSave({ ...settings, Connections: { ...conn, ...patch } });
    return (
        <>
            <FieldGrid columns={2}>
                <Field id="connStartChar" label={t("settings.indicator.startChar")}>
                    <input
                        id="connStartChar"
                        maxLength={1}
                        value={conn.IndicatorStartChar}
                        disabled={!unlocked}
                        autoComplete="off"
                        onChange={(event) => save({ IndicatorStartChar: event.target.value })}
                    />
                </Field>
                <Field id="connEndChar" label={t("settings.indicator.endChar")}>
                    <input
                        id="connEndChar"
                        maxLength={1}
                        value={conn.IndicatorEndChar}
                        disabled={!unlocked}
                        autoComplete="off"
                        onChange={(event) => save({ IndicatorEndChar: event.target.value })}
                    />
                </Field>
            </FieldGrid>
            <p className={connStyles.hint}>{t("settings.indicator.startEndHint")}</p>
            <FieldGrid columns={2}>
                <Field id="connLineEnding" label={t("settings.indicator.lineEnding")}>
                    <Select
                        id="connLineEnding"
                        value={conn.IndicatorLineEnding}
                        options={LINE_ENDING_OPTIONS.map((ending) => ({
                            value: ending,
                            label:
                                t(`settings.indicator.lineEnding.${ending}`) +
                                (ending === DEFAULT_CONNECTIONS.IndicatorLineEnding
                                    ? t("settings.indicator.defaultSuffix")
                                    : ""),
                        }))}
                        disabled={!unlocked}
                        onChange={(value) => save({ IndicatorLineEnding: value })}
                    />
                </Field>
                <label className={connStyles.ckInline}>
                    <input
                        type="checkbox"
                        checked={conn.IndicatorReverseDigits}
                        disabled={!unlocked}
                        onChange={(event) => save({ IndicatorReverseDigits: event.target.checked })}
                    />
                    <span>{t("settings.indicator.reverseDigits")}</span>
                </label>
            </FieldGrid>
        </>
    );
};
