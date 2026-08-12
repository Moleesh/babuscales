import type { LegacyImportPlan } from "@engines/importEngine/legacyImportPlan";

import styles from "./_styles/SystemPane.module.css";
import type { LegacyImportKindCount } from "./useLegacyImportActions";

export interface LegacyImportPlanPreviewProps {
    plan: LegacyImportPlan;
    kindCounts: LegacyImportKindCount[];
    toCreate: number;
    unlocked: boolean;
    committing: boolean;
    onCommit: () => void;
}

// Split out of LegacyImportCard (over the line budget — docs/CodingStandards.md)
// — the parsed-plan preview (row counts, skipped list, commit button),
// unchanged from the inline version it replaces.
export const LegacyImportPlanPreview = ({
    plan,
    kindCounts,
    toCreate,
    unlocked,
    committing,
    onCommit,
}: LegacyImportPlanPreviewProps) => (
    <>
        <ul className={styles.countList}>
            {kindCounts.map(({ kind, count }) => (
                <li key={kind}>
                    <span>{kind}</span>
                    <b>+{count}</b>
                </li>
            ))}
            <li>
                <span>Tickets</span>
                <b>+{plan.ticketDrafts.length}</b>
            </li>
        </ul>
        {plan.skipped.length > 0 && (
            <details>
                <summary className={styles.hint}>
                    {plan.skipped.length} row{plan.skipped.length === 1 ? "" : "s"} skipped — already
                    here or missing a required field
                </summary>
                <ul className={styles.skipList}>
                    {plan.skipped.slice(0, 50).map((skip, i) => (
                        <li key={i}>
                            {skip.Kind} &quot;{skip.Name}&quot; — {skip.Reason}
                        </li>
                    ))}
                    {plan.skipped.length > 50 && <li>…and {plan.skipped.length - 50} more</li>}
                </ul>
            </details>
        )}
        <div className={styles.confirmRow}>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || committing || toCreate === 0}
                onClick={onCommit}
            >
                {committing
                    ? "Importing…"
                    : toCreate === 0
                      ? "Nothing new to import"
                      : `Import ${toCreate} row${toCreate === 1 ? "" : "s"}`}
            </button>
            {!unlocked && (
                <span>Unlock Settings to actually import — previewing needs no password.</span>
            )}
        </div>
    </>
);
