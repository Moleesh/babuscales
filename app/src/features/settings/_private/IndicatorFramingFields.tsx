import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import { useTranslation } from "@i18n/useTranslation";

import { DATA_BITS_OPTIONS, PARITY_OPTIONS, STOP_BITS_OPTIONS } from "../settingsSchema";
import type { ConnectionsConfig, SettingsBody } from "../settingsSchema";
import { IndicatorLineFields } from "./IndicatorLineFields";

export interface IndicatorFramingFieldsProps {
    settings: SettingsBody;
    conn: ConnectionsConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of IndicatorCard (over the line budget — docs/CodingStandards.md)
// — the wire-framing fields the operator asked for by name ("data bits /
// parity / stop bits ... line breaker ... should we reverse the number"):
// previously none of this was configurable at all (src-tauri/src/devices/
// indicator.rs hardcoded 8-N-1/LF/not-reversed). Defaults (8/None/1/LF/off)
// match that old hardcoded behaviour, so an existing install's indicator
// keeps working unchanged until the operator has a reason to touch these —
// use the Listen panel below (IndicatorPortMonitor.tsx) to see whether the
// raw bytes need a different value here. Line ending/reverse-digits split
// into IndicatorLineFields — this file was over budget on its own.
export const IndicatorFramingFields = ({ settings, conn, unlocked, onSave }: IndicatorFramingFieldsProps) => {
    const { t } = useTranslation();
    return (
        <>
            <FieldGrid columns={2}>
                <Field id="connDataBits" label={t("settings.indicator.dataBits")}>
                    <Select
                        id="connDataBits"
                        value={String(conn.IndicatorDataBits)}
                        options={DATA_BITS_OPTIONS.map((bits) => ({ value: String(bits), label: String(bits) }))}
                        disabled={!unlocked}
                        onChange={(value) =>
                            onSave({
                                ...settings,
                                Connections: { ...conn, IndicatorDataBits: Number(value) as 5 | 6 | 7 | 8 },
                            })
                        }
                    />
                </Field>
                <Field id="connParity" label={t("settings.indicator.parity")}>
                    <Select
                        id="connParity"
                        value={conn.IndicatorParity}
                        options={PARITY_OPTIONS.map((parity) => ({
                            value: parity,
                            label: t(`settings.indicator.parity.${parity}`),
                        }))}
                        disabled={!unlocked}
                        onChange={(value) =>
                            onSave({
                                ...settings,
                                Connections: { ...conn, IndicatorParity: value },
                            })
                        }
                    />
                </Field>
                <Field id="connStopBits" label={t("settings.indicator.stopBits")}>
                    <Select
                        id="connStopBits"
                        value={String(conn.IndicatorStopBits)}
                        options={STOP_BITS_OPTIONS.map((bits) => ({ value: String(bits), label: String(bits) }))}
                        disabled={!unlocked}
                        onChange={(value) =>
                            onSave({
                                ...settings,
                                Connections: { ...conn, IndicatorStopBits: Number(value) as 1 | 2 },
                            })
                        }
                    />
                </Field>
            </FieldGrid>
            <IndicatorLineFields settings={settings} conn={conn} unlocked={unlocked} onSave={onSave} />
        </>
    );
};
