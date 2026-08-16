import { useMemo, useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { LanguagePack } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { AppearancePane } from "./_private/AppearancePane";
import { BusinessPane } from "./_private/BusinessPane";
import { ConnectionsPane } from "./_private/ConnectionsPane";
import { FieldsLanguagePane } from "./_private/FieldsLanguagePane";
import { PrintPane } from "./_private/PrintPane";
import { SystemPane } from "./_private/SystemPane";
import { WeighingPane } from "./_private/WeighingPane";
import styles from "./_styles/SettingsScreen.module.css";
import { AdminChip } from "./AdminChip";
import { useSettings } from "./useSettings";

type PaneKey = "biz" | "fields" | "print" | "weigh" | "conn" | "sys";

const buildPaneOptions = (t: (key: string) => string): SegmentedOption<PaneKey>[] => [
    { value: "biz", label: t("settings.pane.biz") },
    { value: "weigh", label: t("settings.pane.weigh") },
    { value: "fields", label: t("settings.pane.fields") },
    { value: "print", label: t("settings.pane.print") },
    { value: "conn", label: t("settings.pane.conn") },
    { value: "sys", label: t("settings.pane.sys") },
];

export interface SettingsScreenProps {
    /** `DataPort.resetDocSeries("Ticket", "default")` — lives at App level, same as everywhere else Settings needs a DataPort call it doesn't otherwise make. Resolves with the new `Epoch` so TicketAndDateTimeCard can persist it into `Numbering.CurrentEpoch`. */
    onResetTicketSeries: (startSeq: number) => Promise<{ Epoch: number }>;
    /** Persists a language pack (`config`, `ConfigKind: "LanguagePack"`) and makes it live — owned at App level, same reason as `onResetTicketSeries`: the loaded pack list lives above `I18nProvider`, which is above this screen. */
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
}

// Originally a seven-pane split ported from demo/BabuScales-demo.html's
// `#setTabs` + `.pane[data-pane]`; Business and Appearance were merged into
// one "biz" tab (both are short, low-traffic forms — a site visits either
// once at setup and rarely again) so they now render stacked under the same
// tab instead of as siblings. Weighing, System, Connections and Print &
// printers are fully wired against a real Settings config row (PLAN's
// "admin password to change configuration"); Appearance is partly wired
// (Operator-on-duty is real, Theme is still a placeholder — see
// AppearancePane); Fields & language is half wired — Language packs are
// real (FieldsLanguagePane), Field schema stays a documented placeholder.
export const SettingsScreen = ({ onResetTicketSeries, onAddLanguagePack }: SettingsScreenProps) => {
    const { unlocked } = useSettings();
    const { t } = useTranslation();
    const [pane, setPane] = useState<PaneKey>("biz");
    const paneOptions = useMemo(() => buildPaneOptions(t), [t]);

    return (
        <div className={styles.screen}>
            <div className={styles.topRow}>
                <SegmentedControl
                    options={paneOptions}
                    value={pane}
                    onChange={setPane}
                    size="big"
                    ariaLabel={t("settings.ariaLabel")}
                />
                {/* Moved here from the app's top bar — it was
                    showing on every tab, not just Settings. */}
                <AdminChip />
            </div>

            {/* Hidden on "biz" (Business & Appearance) by request — most
                of that tab (AppearancePane's Skin/TextScale/OperatorName) is
                deliberately never admin-gated at all, so the banner read as
                noise there even though BusinessPane's own fields still
                individually disable while locked. */}
            {!unlocked && pane !== "biz" && (
                <div className={styles.lockbar}>
                    <span>🔒 {t("settings.lockedMessage")}</span>
                </div>
            )}

            {pane === "biz" && (
                <div className={styles.bizGrid}>
                    <BusinessPane />
                    <AppearancePane />
                </div>
            )}
            {pane === "fields" && <FieldsLanguagePane onAddLanguagePack={onAddLanguagePack} />}
            {pane === "print" && <PrintPane />}
            {pane === "weigh" && <WeighingPane onResetTicketSeries={onResetTicketSeries} />}
            {pane === "conn" && <ConnectionsPane />}
            {pane === "sys" && <SystemPane />}
        </div>
    );
};
