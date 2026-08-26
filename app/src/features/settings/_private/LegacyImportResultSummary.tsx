import { useRef } from "react";

import { ScrollArea } from "@components/ScrollArea";

import styles from "./_styles/SystemPane.module.css";
import type { LegacyImportRunResult } from "./legacyImportRun";

export interface LegacyImportResultSummaryProps {
    result: LegacyImportRunResult;
    committedSkipped: number;
}

// Split out of LegacyImportCard (over the line budget — docs/CodingStandards.md)
// — the post-commit result summary, unchanged from the inline version it
// replaces.
export const LegacyImportResultSummary = ({ result, committedSkipped }: LegacyImportResultSummaryProps) => {
    const skipListRef = useRef<HTMLDivElement | null>(null);
    return (
        <div>
            <p className={styles.applied}>
                Imported — {result.masterCreated} master{result.masterCreated === 1 ? "" : "s"},{" "}
                {result.ticketCreated} ticket{result.ticketCreated === 1 ? "" : "s"}
                {committedSkipped > 0 && `, ${committedSkipped} skipped`}. A pre-import backup was saved to
                your downloads first.
            </p>
            {result.failed.length > 0 && (
                <>
                    <p className={styles.bad}>{result.failed.length} row(s) failed:</p>
                    <ScrollArea
                        contentRef={skipListRef}
                        className={styles["skip-list-outer"]}
                        contentClassName={styles["skip-list-area"]}
                    >
                        <ul className={styles.skipList}>
                            {result.failed.map((f, i) => (
                                <li key={i}>
                                    {f.label} — {f.message}
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </>
            )}
        </div>
    );
};
