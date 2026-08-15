import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import { BAUD_RATE_OPTIONS } from "../settingsSchema";
import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";

export interface IndicatorPortFieldsProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
    ports: string[];
}

// Split out of IndicatorCard (over the line budget — docs/CodingStandards.md)
// — the serial port/baud selects, unchanged from the inline version it
// replaces.
export const IndicatorPortFields = ({ settings, conn, unlocked, onSave, ports }: IndicatorPortFieldsProps) => {
    const { t } = useTranslation();
    return (
    <FieldGrid columns={2}>
        <Field id="connPort" label={t("settings.indicator.serialPort")}>
            <Select
                id="connPort"
                value={conn.IndicatorPort}
                options={[{ value: "", label: "Not connected" }, ...ports.map((port) => ({ value: port, label: port }))]}
                disabled={!unlocked}
                onChange={(value) => onSave({ ...settings, Connections: { ...conn, IndicatorPort: value } })}
            />
        </Field>
        <Field id="connBaud" label={t("settings.baudRate")}>
            <Select
                id="connBaud"
                value={String(conn.IndicatorBaud)}
                options={BAUD_RATE_OPTIONS.map((baud) => ({ value: String(baud), label: String(baud) }))}
                disabled={!unlocked}
                onChange={(value) =>
                    onSave({ ...settings, Connections: { ...conn, IndicatorBaud: Number(value) } })
                }
            />
        </Field>
    </FieldGrid>
    );
};
