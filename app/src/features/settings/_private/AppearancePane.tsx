import { Card } from "@components/Card";
import { Field } from "@components/Field";

import { useSettings } from "../useSettings";
import styles from "./AppearancePane.module.css";

// Appearance pane (demo/BabuScales-demo.html's `data-pane="look"`) — the
// mock's own comment marks this whole pane "not admin-gated: this is
// operator comfort", unlike every other pane. "Operator on duty" is real —
// nothing else here is yet: the six skins are already ported verbatim to
// styles/tokens.css (app/README.md's "Carried over from the mock,
// verbatim"), but there's no picker UI to switch `data-skin` at runtime,
// and text size/language live under I18nProvider, not Settings.
export const AppearancePane = () => {
    const { settings, setOperatorName } = useSettings();

    return (
        <div className={styles.grid}>
            <Card title={<span className="lbl">Operator on duty</span>}>
                <Field id="setOp" label={{ en: "Name" }}>
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
            <Card title={<span className="lbl">Theme</span>}>
                <p className={styles.note}>
                    The six skins and the text-size control aren&apos;t wired up as a picker here
                    yet — this pane will get one once it&apos;s built (app/README.md known gap).
                </p>
            </Card>
        </div>
    );
};
