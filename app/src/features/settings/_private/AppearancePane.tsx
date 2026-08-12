import { Card } from "@components/Card";
import { Field } from "@components/Field";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import { useTranslation } from "@i18n/useTranslation";

import { SKIN_FIXTURES, TEXT_SCALE_OPTIONS } from "../settingsSchema";
import type { TextScale } from "../settingsSchema";
import { useSettings } from "../useSettings";
import styles from "./_styles/AppearancePane.module.css";

// Appearance pane (demo/BabuScales-demo.html's `data-pane="look"`) — the
// mock's own comment marks this whole pane "not admin-gated: this is
// operator comfort", unlike every other pane. Task #51 wires up the last
// placeholder here: the six skins (already ported verbatim to
// styles/tokens.css) now have a real picker, and the mock's four-step text
// size row is ported via the existing SegmentedControl component. Language
// is a deliberate divergence from the mock, kept out of this pane — it
// lives in the top-bar chip instead (see I18nProvider), not duplicated here.
const TEXT_SCALE_LABELS: Record<TextScale, string> = { 0.9: "A−", 1: "A", 1.12: "A+", 1.28: "A++" };
const textScaleOptions: SegmentedOption<string>[] = TEXT_SCALE_OPTIONS.map((scale) => ({
    value: String(scale),
    label: TEXT_SCALE_LABELS[scale],
}));

export const AppearancePane = () => {
    const { settings, setOperatorName, setSkin, setTextScale } = useSettings();
    const { t } = useTranslation();

    return (
        <div className={styles.grid}>
            <Card title={<span className="lbl">{t("settings.appearance.theme")}</span>}>
                <div className={styles.themeBody}>
                    <div className={styles.skins} role="group" aria-label={t("settings.appearance.theme")}>
                        {SKIN_FIXTURES.map((skin) => (
                            <button
                                key={skin.key}
                                type="button"
                                className={styles.skin}
                                aria-pressed={settings.Skin === skin.key}
                                onClick={() => void setSkin(skin.key)}
                            >
                                <span className={styles.swatch}>
                                    {skin.swatch.map((color, i) => (
                                        <i
                                            key={color}
                                            className={i === 2 ? styles.accent : undefined}
                                            style={{ background: color }}
                                        />
                                    ))}
                                </span>
                                {skin.name}
                            </button>
                        ))}
                    </div>
                    <Field id="setFs" label={t("settings.appearance.textSize")}>
                        <SegmentedControl
                            options={textScaleOptions}
                            value={String(settings.TextScale)}
                            onChange={(value) => void setTextScale(Number(value) as TextScale)}
                            ariaLabel={t("settings.appearance.textSize")}
                        />
                    </Field>
                </div>
            </Card>
            <Card title={<span className="lbl">{t("settings.appearance.operatorOnDuty")}</span>}>
                <Field id="setOp" label={t("settings.appearance.operatorName")}>
                    <input
                        id="setOp"
                        defaultValue={settings.OperatorName}
                        key={settings.OperatorName}
                        onBlur={(event) => void setOperatorName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                        }}
                    />
                </Field>
            </Card>
        </div>
    );
};
