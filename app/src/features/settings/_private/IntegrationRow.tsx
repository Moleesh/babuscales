import type { IntegrationFixture } from "../settingsSchema";
import styles from "./_styles/ConnectionsPane.module.css";

interface IntegrationRowProps {
    fixture: IntegrationFixture;
    on: boolean;
    unlocked: boolean;
    onToggle: () => void;
    onConfigure: () => void;
}

// Split out of ConnectionsPane (over the line budget — docs/CodingStandards.md)
// — one row of the Integrations fixture list, unchanged from the inline
// version it replaces.
export const IntegrationRow = ({ fixture, on, unlocked, onToggle, onConfigure }: IntegrationRowProps) => (
    <div className={`${styles.tpl} ${on ? styles.tplOn : ""}`}>
        <span className={styles.tplName}>{fixture.name}</span>
        {on && <span className={styles.badge}>on</span>}
        <span className={styles.tplMeta}>{fixture.config}</span>
        <span className={styles.tplActs}>
            <button type="button" className={styles.mini} disabled={!unlocked} onClick={onToggle}>
                {on ? "Turn off" : "Turn on"}
            </button>
            <button type="button" className={styles.mini} disabled={!unlocked} onClick={onConfigure}>
                Configure
            </button>
        </span>
    </div>
);
