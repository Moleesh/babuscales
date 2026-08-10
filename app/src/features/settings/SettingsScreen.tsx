import { useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";

import { AppearancePane } from "./_private/AppearancePane";
import { ConnectionsPane } from "./_private/ConnectionsPane";
import { PlaceholderPane } from "./_private/PlaceholderPane";
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
}

// Six-pane split, ported from demo/BabuScale-demo.html's `#setTabs` +
// `.pane[data-pane]`. Weighing, System and Connections are fully wired
// against a real Settings config row (PLAN's "admin password to change
// configuration"); Appearance is partly wired (Operator-on-duty is real,
// Theme is still a placeholder — see AppearancePane); Fields & language
// and Print & printers stay full documented placeholders — see
// PlaceholderPane.
export const SettingsScreen = ({ onResetTicketSeries }: SettingsScreenProps) => {
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

            {pane === "fields" && (
                <PlaceholderPane
                    title="Fields & language"
                    note="Editing DEFAULT_TICKET_SCHEMA's field labels and required-ness, and managing uploaded language packs, needs a Schema-config editor that isn't built yet (app/README.md known gap: schema-driven rendering)."
                />
            )}
            {pane === "print" && (
                <PlaceholderPane
                    title="Print & printers"
                    note="Printer selection and print-template editing depend on the print/export engine, which isn't built yet (app/README.md known gap: Print/export)."
                />
            )}
            {pane === "look" && <AppearancePane />}
            {pane === "weigh" && <WeighingPane />}
            {pane === "conn" && <ConnectionsPane />}
            {pane === "sys" && <SystemPane onResetTicketSeries={onResetTicketSeries} />}
        </div>
    );
};
