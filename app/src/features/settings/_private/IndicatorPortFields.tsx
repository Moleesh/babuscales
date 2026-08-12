import { Field, FieldGrid } from "@components/Field";

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
export const IndicatorPortFields = ({ settings, conn, unlocked, onSave, ports }: IndicatorPortFieldsProps) => (
    <FieldGrid columns={2}>
        <Field id="connPort" label={{ en: "Serial port", ta: "சீரியல் போர்ட்" }}>
            <select
                id="connPort"
                value={conn.IndicatorPort}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({ ...settings, Connections: { ...conn, IndicatorPort: event.target.value } })
                }
            >
                <option value="">Not connected</option>
                {ports.map((port) => (
                    <option key={port} value={port}>
                        {port}
                    </option>
                ))}
            </select>
        </Field>
        <Field id="connBaud" label={{ en: "Baud rate", ta: "பாட் விகிதம்" }}>
            <select
                id="connBaud"
                value={conn.IndicatorBaud}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({
                        ...settings,
                        Connections: { ...conn, IndicatorBaud: Number(event.target.value) },
                    })
                }
            >
                {BAUD_RATE_OPTIONS.map((baud) => (
                    <option key={baud} value={baud}>
                        {baud}
                    </option>
                ))}
            </select>
        </Field>
    </FieldGrid>
);
