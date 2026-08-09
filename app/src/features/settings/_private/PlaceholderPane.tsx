import { Card } from "@components/Card";

import styles from "./PlaceholderPane.module.css";

export interface PlaceholderPaneProps {
    title: string;
    note: string;
}

// Fields & language, Print & printers, Appearance and Connections
// (demo/BabuScale-demo.html's `data-pane="fields"`/`"print"`/`"look"`/`"conn"`)
// stay documented placeholders — each names what it would configure and
// which unbuilt feature it depends on, rather than rendering mock inputs
// that write nowhere (app/README.md's known gaps).
export const PlaceholderPane = ({ title, note }: PlaceholderPaneProps) => (
    <Card title={<span className="lbl">{title}</span>}>
        <p className={styles.body}>{note}</p>
    </Card>
);
