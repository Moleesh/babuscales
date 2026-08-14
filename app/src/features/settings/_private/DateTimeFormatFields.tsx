import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import type { SettingsBody } from "../settingsSchema";

export interface DateTimeFormatFieldsProps {
    settings: SettingsBody;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of DateTimeFormatsCard (over the line budget — docs/CodingStandards.md)
// — the Date format / Time format selects, unchanged from the inline
// version it replaces.
export const DateTimeFormatFields = ({ settings, unlocked, onSave }: DateTimeFormatFieldsProps) => {
    const { t } = useTranslation();
    return (
    <FieldGrid columns={2}>
        <Field id="setDate" label={t("settings.dateTimeFormats.date")}>
            <select
                id="setDate"
                value={settings.Formats.DateFmt}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({ ...settings, Formats: { ...settings.Formats, DateFmt: event.target.value } })
                }
            >
                <option value="dd MMM yyyy">dd MMM yyyy — 09 Aug 2026</option>
                <option value="dd-MM-yyyy">dd-MM-yyyy — 09-08-2026</option>
                <option value="dd/MM/yy">dd/MM/yy — 09/08/26</option>
                <option value="yyyy-MM-dd">yyyy-MM-dd — 2026-08-09</option>
            </select>
        </Field>
        <Field id="setTime" label={t("settings.dateTimeFormats.time")}>
            <select
                id="setTime"
                value={settings.Formats.TimeFmt}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({
                        ...settings,
                        Formats: { ...settings.Formats, TimeFmt: event.target.value as "24" | "12" },
                    })
                }
            >
                <option value="24">24 hour — 14:32</option>
                <option value="12">12 hour — 02:32 PM</option>
            </select>
        </Field>
        <Field id="setWeightUnit" label={t("settings.amountFields.weightUnit")}>
            <select
                id="setWeightUnit"
                value={settings.Formats.WeightUnit}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({
                        ...settings,
                        Formats: {
                            ...settings.Formats,
                            WeightUnit: event.target.value as SettingsBody["Formats"]["WeightUnit"],
                        },
                    })
                }
            >
                <option value="kg">{t("settings.amountFields.weightUnitKg")}</option>
                <option value="t">{t("settings.amountFields.weightUnitT")}</option>
            </select>
        </Field>
    </FieldGrid>
    );
};
