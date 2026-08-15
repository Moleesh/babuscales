import { Field, FieldGrid } from "@components/Field";
import { Select } from "@components/Select";
import type { DateFmt } from "@constants/numberFormat";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";

export interface DateTimeFormatFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

const DATE_FMT_OPTIONS: { value: DateFmt; label: string }[] = [
    { value: "dd MMM yyyy", label: "dd MMM yyyy — 09 Aug 2026" },
    { value: "dd-MM-yyyy", label: "dd-MM-yyyy — 09-08-2026" },
    { value: "dd/MM/yy", label: "dd/MM/yy — 09/08/26" },
    { value: "yyyy-MM-dd", label: "yyyy-MM-dd — 2026-08-09" },
];

const TIME_FMT_OPTIONS: { value: "24" | "12"; label: string }[] = [
    { value: "24", label: "24 hour — 14:32" },
    { value: "12", label: "12 hour — 02:32 PM" },
];

// Split out of DateTimeFormatsCard (over the line budget — docs/CodingStandards.md)
// — the Date format / Time format selects, unchanged from the inline
// version it replaces.
export const DateTimeFormatFields = ({ settings, unlocked, onSave }: DateTimeFormatFieldsProps) => {
    const { t } = useTranslation();
    const weightUnitOptions: { value: SettingsBody["Formats"]["WeightUnit"]; label: string }[] = [
        { value: "kg", label: t("settings.amountFields.weightUnitKg") },
        { value: "t", label: t("settings.amountFields.weightUnitT") },
    ];
    return (
    <FieldGrid columns={2}>
        <Field id="setDate" label={t("settings.dateTimeFormats.date")}>
            <Select
                id="setDate"
                value={settings.Formats.DateFmt}
                options={DATE_FMT_OPTIONS}
                disabled={!unlocked}
                onChange={(value) => onSave({ ...settings, Formats: { ...settings.Formats, DateFmt: value } })}
            />
        </Field>
        <Field id="setTime" label={t("settings.dateTimeFormats.time")}>
            <Select
                id="setTime"
                value={settings.Formats.TimeFmt}
                options={TIME_FMT_OPTIONS}
                disabled={!unlocked}
                onChange={(value) => onSave({ ...settings, Formats: { ...settings.Formats, TimeFmt: value } })}
            />
        </Field>
        <Field id="setWeightUnit" label={t("settings.amountFields.weightUnit")}>
            <Select
                id="setWeightUnit"
                value={settings.Formats.WeightUnit}
                options={weightUnitOptions}
                disabled={!unlocked}
                onChange={(value) =>
                    onSave({ ...settings, Formats: { ...settings.Formats, WeightUnit: value } })
                }
            />
        </Field>
    </FieldGrid>
    );
};
