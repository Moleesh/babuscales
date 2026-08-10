import { useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { LanguagePack } from "@i18n/types";

import { AppearancePane } from "./_private/AppearancePane";
import { ConnectionsPane } from "./_private/ConnectionsPane";
import { FieldsLanguagePane } from "./_private/FieldsLanguagePane";
import { PrintPane } from "./_private/PrintPane";
import { SystemPane } from "./_private/SystemPane";
import { WeighingPane } from "./_private/WeighingPane";
import styles from "./SettingsScreen.module.css";
import { useSettings } from "./useSettings";

type PaneKey = "fields" | "print" | "look" | "weigh" | "conn" | "sys";

const PANE_OPTIONS: SegmentedOption<PaneKey>[] = [
    { value: "fields", label: "Fields & language" },
    { value: "print", label: "Print & printers" },
    { value: "look", label: "Appearance" },
    { value: "weigh", label: "Weighing" },
    { value: "conn", label: "Connections" },
    { value: "sys", label: "System" },
];

export interface SettingsScreenProps {
    /** `DataPort.resetDocSeries("Ticket", "default")` — lives at App level, same as everywhere else Settings needs a DataPort call it doesn't otherwise make. */
    onResetTicketSeries: () => Promise<void>;
    /** Persists a language pack (`config`, `ConfigKind: "LanguagePack"`) and makes it live — owned at App level, same reason as `onResetTicketSeries`: the loaded pack list lives above `I18nProvider`, which is above this screen. */
    onAddLanguagePack: (pack: LanguagePack) => Promise<void>;
}

// Six-pane split, ported from demo/BabuScale-demo.html's `#setTabs` +
// `.pane[data-pane]`. Weighing, System, Connections and Print & printers
// are fully wired against a real Settings config row (PLAN's "admin
// password to change configuration"); Appearance is partly wired
// (Operator-on-duty is real, Theme is still a placeholder — see
// AppearancePane); Fields & language is half wired — Language packs are
// real (FieldsLanguagePane), Field schema stays a documented placeholder.
export const SettingsScreen = ({ onResetTicketSeries, onAddLanguagePack }: SettingsScreenProps) => {
    const { unlocked } = useSettings();
    const [pane, setPane] = useState<PaneKey>("weigh");

    return (
        <div className={styles.screen}>
            <SegmentedControl
                options={PANE_OPTIONS}
                value={pane}
                onChange={setPane}
                size="big"
                ariaLabel="Settings section"
            />

            {!unlocked && (
                <div className={styles.lockbar}>
                    <span>
                        🔒 Settings are read-only. Unlock with the admin password to change
                        anything.
                    </span>
                </div>
            )}

            {pane === "fields" && <FieldsLanguagePane onAddLanguagePack={onAddLanguagePack} />}
            {pane === "print" && <PrintPane />}
            {pane === "look" && <AppearancePane />}
            {pane === "weigh" && <WeighingPane />}
            {pane === "conn" && <ConnectionsPane />}
            {pane === "sys" && <SystemPane onResetTicketSeries={onResetTicketSeries} />}
        </div>
    );
};
