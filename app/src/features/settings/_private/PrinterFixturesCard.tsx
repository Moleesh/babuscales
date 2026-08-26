import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import type { Localized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { PRINTER_FIXTURES } from "../settingsSchema";
import type { PrinterKind, PrintersConfig } from "../settingsSchema";
import styles from "./_styles/PrintPane.module.css";

const PRINTER_ROWS: readonly [key: keyof PrintersConfig, kind: PrinterKind, label: Localized][] = [
    ["A4", "a4", { en: "Default · A4 laser / inkjet", ta: "இயல்பு · A4 லேசர் / இங்க்ஜெட்" }],
    ["Mx", "mx", { en: "Default · dot matrix", ta: "இயல்பு · டாட் மேட்ரிக்ஸ்" }],
    ["Th", "th", { en: "Default · thermal roll", ta: "இயல்பு · தெர்மல் ரோல்" }],
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
            sticky
            title={<span className="lbl">{t("settings.printerFixtures.title")}</span>}
            headerRight={
                <span className={styles.applied}>{t("settings.weighingRules.appliedImmediately")}</span>
            }
        >
            <FieldGrid columns={3}>
                {PRINTER_ROWS.map(([key, kind, label]) => (
                    <Field key={key} id={`prn-${key}`} label={label}>
                        <Select
                            id={`prn-${key}`}
                            value={printers[key]}
                            options={PRINTER_FIXTURES.filter((p) => p.kind === kind).map((p) => ({
                                value: p.name,
                                label: p.name,
                            }))}
                            disabled={!unlocked}
                            onChange={(value) => onChange(key, value)}
                        />
                    </Field>
                ))}
            </FieldGrid>
        </Card>
    );
};
