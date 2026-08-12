import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import type { DailySummaryConfig, SettingsBody } from "../settingsSchema";
import styles from "./_styles/SystemPane.module.css";

export interface DailySummaryScheduleFieldsProps {
    settings: SettingsBody;
    cfg: DailySummaryConfig;
    unlocked: boolean;
    onSave: (next: SettingsBody) => void;
}

// Split out of DailySummaryCard (over the line budget — docs/CodingStandards.md)
// — the "send automatically" checkbox plus Time/Recipient fields, unchanged
// from the inline version it replaces.
export const DailySummaryScheduleFields = ({
    settings,
    cfg,
    unlocked,
    onSave,
}: DailySummaryScheduleFieldsProps) => {
    const { t } = useTranslation();
    return (
    <>
        <label className={styles.ck}>
            <input
                type="checkbox"
                checked={cfg.Enabled}
                disabled={!unlocked}
                onChange={(event) =>
                    onSave({ ...settings, DailySummary: { ...cfg, Enabled: event.target.checked } })
                }
            />
            <span>{t("settings.dailySummary.sendAutomatically")}</span>
        </label>
        <FieldGrid columns={2}>
            <Field id="dsTime" label={{ en: "Send at", ta: "அனுப்ப வேண்டிய நேரம்" }}>
                <input
                    id="dsTime"
                    type="time"
                    value={cfg.Time}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, DailySummary: { ...cfg, Time: event.target.value } })
                    }
                />
            </Field>
            <Field id="dsRecipient" label={{ en: "Recipient e-mail", ta: "பெறுநர் மின்னஞ்சல்" }}>
                <input
                    id="dsRecipient"
                    type="email"
                    placeholder="admin@example.com"
                    value={cfg.Recipient}
                    disabled={!unlocked}
                    onChange={(event) =>
                        onSave({ ...settings, DailySummary: { ...cfg, Recipient: event.target.value } })
                    }
                />
            </Field>
        </FieldGrid>
    </>
    );
};
