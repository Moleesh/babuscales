import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/ReportBuilderModal.module.css";
import { datePresetRange } from "./reportDatePresets";
import type { DatePresetKey } from "./reportDatePresets";

const PRESET_KEYS: DatePresetKey[] = ["today", "month", "year", "all"];

export interface ReportBuilderPresetsProps {
    onDateFromChange: (date: string) => void;
    onDateToChange: (date: string) => void;
}

// Split out of ReportBuilderModal (over the line/complexity budget —
// docs/CodingStandards.md) — the quick date-range preset row.
export const ReportBuilderPresets = ({
    onDateFromChange,
    onDateToChange,
}: ReportBuilderPresetsProps) => {
    const { t } = useTranslation();

    const applyPreset = (preset: DatePresetKey): void => {
        const { from, to } = datePresetRange(preset);
        onDateFromChange(from);
        onDateToChange(to);
    };

    return (
        <div className={styles.presets}>
            {PRESET_KEYS.map((preset) => (
                <button
                    key={preset}
                    type="button"
                    className={styles.preset}
                    onClick={() => applyPreset(preset)}
                >
                    {t(`reports.builder.preset.${preset}`)}
                </button>
            ))}
        </div>
    );
};
