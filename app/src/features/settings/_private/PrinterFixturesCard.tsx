import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import { PRINTER_FIXTURES } from "../settingsSchema";
import type { PrinterKind, PrintersConfig } from "../settingsSchema";
import styles from "./_styles/PrintPane.module.css";

const PRINTER_ROWS: readonly [key: keyof PrintersConfig, kind: PrinterKind, label: string][] = [
    ["A4", "a4", "Default · A4 laser / inkjet"],
    ["Mx", "mx", "Default · dot matrix"],
    ["Th", "th", "Default · thermal roll"],
];

export interface PrinterFixturesCardProps {
    printers: PrintersConfig;
    unlocked: boolean;
    onChange: (key: keyof PrintersConfig, value: string) => void;
}

// Split out of PrintPane (over the line budget — docs/CodingStandards.md) —
// the "Printers" fixture-assignment card, unchanged from the inline version
// it replaces.
export const PrinterFixturesCard = ({ printers, unlocked, onChange }: PrinterFixturesCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("settings.printerFixtures.title")}</span>}
            headerRight={
                <span className={styles.applied}>{t("settings.weighingRules.appliedImmediately")}</span>
            }
        >
            <FieldGrid columns={3}>
                {PRINTER_ROWS.map(([key, kind, label]) => (
                    <Field key={key} id={`prn-${key}`} label={{ en: label }}>
                        <select
                            id={`prn-${key}`}
                            value={printers[key]}
                            disabled={!unlocked}
                            onChange={(event) => onChange(key, event.target.value)}
                        >
                            {PRINTER_FIXTURES.filter((p) => p.kind === kind).map((p) => (
                                <option key={p.name} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                ))}
            </FieldGrid>
        </Card>
    );
};
