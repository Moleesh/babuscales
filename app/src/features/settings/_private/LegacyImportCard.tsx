import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";

import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { LegacyImportFileRow } from "./LegacyImportFileRow";
import { LegacyImportPlanPreview } from "./LegacyImportPlanPreview";
import { LegacyImportResultSummary } from "./LegacyImportResultSummary";
import { useLegacyImportActions } from "./useLegacyImportActions";

// Task #47, PLAN §22 Phase 7 "legacy v1/v2 import" — a one-time tool for a
// site moving off VaultBill (the older desktop products PLAN calls v1/v2)
// onto BabuScales. Reads a documented JSON bundle (legacyImportBundle.ts)
// rather than VaultBill's own database file directly: that file's real
// schema isn't available to this codebase to build a native reader against
// (no v1/v2 source tree exists here), so a site converts its outgoing data
// into this bundle shape first — by hand for a small site, or with a short
// script for a large one — and this card takes it from there. Every write
// still goes through the same `DataPort.saveMaster`/`saveDoc` calls every
// other feature uses; nothing about the destination is special-cased for
// import.
//
// Preview-before-commit and a restore point before writing anything
// (PLAN §14's "portable bundle" language, reused here even though this
// isn't that richer NDJSON format) — gated by `unlocked` for the commit
// step only, same asymmetry as BackupRestoreCard's own save-vs-restore
// split: previewing a file is read-only and safe at any time, committing
// touches masters and tickets in bulk and needs the admin password.
export const LegacyImportCard = () => {
    const db = useDataPort();
    const { unlocked } = useSettings();
    const {
        fileName,
        parseError,
        plan,
        loadingPlan,
        committing,
        result,
        committedSkipped,
        inputRef,
        toCreate,
        kindCounts,
        reset,
        handleFile,
        handleCommit,
    } = useLegacyImportActions(db);

    return (
        <Card title={<span className="lbl">Legacy import (v1/v2)</span>}>
            <div className={styles.body}>
                <LegacyImportFileRow
                    inputRef={inputRef}
                    fileName={fileName}
                    hasResult={result !== null}
                    committing={committing}
                    onFile={(file) => void handleFile(file)}
                    onClear={reset}
                />

                {loadingPlan && <p className={styles.hint}>Reading what&apos;s already here…</p>}
                {parseError && <p className={styles.bad}>Couldn&apos;t read that file — {parseError}</p>}

                {plan && (
                    <LegacyImportPlanPreview
                        plan={plan}
                        kindCounts={kindCounts}
                        toCreate={toCreate}
                        unlocked={unlocked}
                        committing={committing}
                        onCommit={() => void handleCommit()}
                    />
                )}

                {result && (
                    <LegacyImportResultSummary result={result} committedSkipped={committedSkipped} />
                )}

                <p className={styles.hint}>
                    Takes a documented JSON bundle (see docs/AdminSetup.md), not a VaultBill database
                    file directly — a site migrating converts its old data into that shape first, by
                    hand or with a short script. Matches masters by name and tickets by their own
                    legacy id, so importing the same file twice is safe — nothing is created twice.
                    Saves a restore-point backup automatically before writing anything.
                </p>
            </div>
        </Card>
    );
};
