import { formatWeightKg } from "@constants/numberFormat";

import { useClock } from "./_private/useClock";
import styles from "./_styles/WeightDisplay.module.css";

export interface WeightDisplayLabels {
    indicator: string;
    stable: string;
    motion: string;
    unit: string;
}

export interface WeightDisplayProps {
    weightKg: number;
    capacityKg: number;
    stable: boolean;
    motion: boolean;
    mode?: "full" | "compact";
    labels?: WeightDisplayLabels;
    /** Placeholder digits behind the live reading, sized to the display's widest expected value. */
    ghostPattern?: string;
    /** i18n's active language ("en"/"ta") — decides the header clock's locale. A plain
     * prop (not useTranslation()) so this component stays usable outside an I18nProvider,
     * same reasoning as `labels` below. */
    lang?: string;
}

const DEFAULT_LABELS: WeightDisplayLabels = {
    indicator: "Indicator",
    stable: "Stable",
    motion: "Motion",
    unit: "kg",
};

// The live weight indicator readout — one instrument, shown at full size on
// the Weighing screen and compact everywhere else it needs to stay visible
// (PLAN §13). Never blocks: a lorry parks with one weight and the deck is
// free again immediately (§7.5) — this component just shows what the
// bridge currently reads, nothing about who is waiting.
export const WeightDisplay = ({
    weightKg,
    capacityKg,
    stable,
    motion,
    mode = "full",
    labels = DEFAULT_LABELS,
    ghostPattern = "88,888",
    lang = "en",
}: WeightDisplayProps) => {
    const { time, day } = useClock(lang);
    const fillPct = Math.min(100, Math.round((weightKg / capacityKg) * 100));

    return (
        <section
            className={`${styles.head} ${mode === "compact" ? styles.compact : ""}`}
            aria-label={labels.indicator}
        >
            <div className={styles.headLeft}>
                <div className="lbl">{labels.indicator}</div>
                <div className={styles.lamps}>
                    <span className={`${styles.lamp} ${stable ? styles.on : ""}`}>
                        <span className={styles.dot} />
                        {labels.stable}
                    </span>
                    <span className={`${styles.lamp} ${motion ? styles.busy : ""}`}>
                        <span className={styles.dot} />
                        {labels.motion}
                    </span>
                </div>
            </div>

            <div className={styles.readout}>
                <div className={styles.ghost} aria-hidden="true">
                    <span>{ghostPattern}</span>
                </div>
                <span className={`${styles.digits} num`}>{formatWeightKg(weightKg)}</span>
                <span className={styles.unit}>{labels.unit}</span>
            </div>

            <div className={styles.headRight}>
                <div className={`${styles.clock} num`}>{time}</div>
                <div className={styles.cday}>{day}</div>
                <div className={styles.cap}>
                    <i className={styles.capBar} style={{ width: `${fillPct}%` }} />
                </div>
            </div>
        </section>
    );
};
