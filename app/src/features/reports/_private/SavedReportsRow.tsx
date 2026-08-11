import type { ReportDefinition } from "@db/reportDefs";

import styles from "./SavedReportsRow.module.css";

export interface SavedReportsRowProps {
    savedReports: ReportDefinition[];
    newName: string;
    onNewNameChange: (name: string) => void;
    onSave: () => void;
    onRecall: (def: ReportDefinition) => void;
    onDelete: (id: string) => void;
}

// Task #54's saved-report-definitions row, split out of ReportsScreen.tsx
// (over the 200-line component budget — docs/CodingStandards.md) — same
// "self-contained, everything comes in as props" shape as
// weighing/_private's own cards. See db/reportDefs.ts for the full design
// reasoning (why this is scoped to View/GroupBy/Filter, not a dynamic
// query builder).
export const SavedReportsRow = ({
    savedReports,
    newName,
    onNewNameChange,
    onSave,
    onRecall,
    onDelete,
}: SavedReportsRowProps) => (
    <div className={styles.row}>
        {savedReports.map((def) => (
            <span key={def.Id} className={styles.chip}>
                <button type="button" className="chip act" onClick={() => onRecall(def)}>
                    {def.Name}
                </button>
                <button
                    type="button"
                    className={styles.delete}
                    aria-label={`Delete saved report ${def.Name}`}
                    onClick={() => onDelete(def.Id)}
                >
                    ×
                </button>
            </span>
        ))}
        <input
            className={styles.input}
            value={newName}
            onChange={(event) => onNewNameChange(event.target.value)}
            placeholder="Save current view as…"
            aria-label="New saved report name"
        />
        <button type="button" className={styles.mini} disabled={!newName.trim()} onClick={onSave}>
            Save view
        </button>
    </div>
);
