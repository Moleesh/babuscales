import { useRef, useState } from "react";

import { Card } from "@components/Card";
import { timestampForFilename } from "@constants/timestampForFilename";
import { useDataPort } from "@db/useDataPort";
import { parseLegacyBundle } from "@engines/importEngine/legacyImportBundle";
import { planLegacyImport } from "@engines/importEngine/legacyImportPlan";
import type { LegacyImportPlan } from "@engines/importEngine/legacyImportPlan";

import { useSettings } from "../useSettings";
import { commitLegacyImport, loadExistingState } from "./legacyImportRun";
import type { LegacyImportRunResult } from "./legacyImportRun";
import styles from "./SystemPane.module.css";

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
    const [fileName, setFileName] = useState<string | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [plan, setPlan] = useState<LegacyImportPlan | null>(null);
    const [loadingPlan, setLoadingPlan] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [result, setResult] = useState<LegacyImportRunResult | null>(null);
    const [committedSkipped, setCommittedSkipped] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const reset = (): void => {
        setFileName(null);
        setParseError(null);
        setPlan(null);
        setResult(null);
        setCommittedSkipped(0);
    };

    const handleFile = async (file: File): Promise<void> => {
        reset();
        setFileName(file.name);
        try {
            const bundle = parseLegacyBundle(JSON.parse(await file.text()));
            setLoadingPlan(true);
            const existing = await loadExistingState(db);
            setPlan(planLegacyImport(bundle, existing));
        } catch (err) {
            setParseError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoadingPlan(false);
        }
    };

    const handleCommit = async (): Promise<void> => {
        if (!plan) return;
        setCommitting(true);
        try {
            // Restore point first — an import that goes wrong halfway
            // through should never be a worse position than "restore this
            // file and try again" (PLAN §14).
            const bytes = await db.exportBackup();
            const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `babuscales-pre-import-${timestampForFilename()}.bak`;
            link.click();
            URL.revokeObjectURL(url);

            const runResult = await commitLegacyImport(db, plan);
            setCommittedSkipped(plan.skipped.length);
            setResult(runResult);
            setPlan(null);
        } finally {
            setCommitting(false);
        }
    };

    const toCreate = plan ? plan.masterDrafts.length + plan.ticketDrafts.length : 0;
    const kindCounts = plan
        ? Object.entries(
              plan.masterDrafts.reduce<Record<string, number>>((acc, { kind }) => {
                  acc[kind] = (acc[kind] ?? 0) + 1;
                  return acc;
              }, {}),
          )
        : [];

    return (
        <Card title={<span className="lbl">Legacy import (v1/v2)</span>}>
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <label className={`${styles.mini} ${committing ? styles.miniLabelDisabled : ""}`}>
                        Choose import file…
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".json"
                            hidden
                            disabled={committing}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) void handleFile(file);
                            }}
                        />
                    </label>
                    {fileName && <span className={styles.hint}>{fileName}</span>}
                    {(fileName || result) && (
                        <button
                            type="button"
                            className={styles.mini}
                            disabled={committing}
                            onClick={() => {
                                reset();
                                if (inputRef.current) inputRef.current.value = "";
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {loadingPlan && <p className={styles.hint}>Reading what&apos;s already here…</p>}
                {parseError && <p className={styles.bad}>Couldn&apos;t read that file — {parseError}</p>}

                {plan && (
                    <>
                        <ul className={styles.countList}>
                            {kindCounts.map(([kind, count]) => (
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
                                    {plan.skipped.length} row{plan.skipped.length === 1 ? "" : "s"}{" "}
                                    skipped — already here or missing a required field
                                </summary>
                                <ul className={styles.skipList}>
                                    {plan.skipped.slice(0, 50).map((skip, i) => (
                                        <li key={i}>
                                            {skip.Kind} &quot;{skip.Name}&quot; — {skip.Reason}
                                        </li>
                                    ))}
                                    {plan.skipped.length > 50 && (
                                        <li>…and {plan.skipped.length - 50} more</li>
                                    )}
                                </ul>
                            </details>
                        )}
                        <div className={styles.confirmRow}>
                            <button
                                type="button"
                                className={styles.mini}
                                disabled={!unlocked || committing || toCreate === 0}
                                onClick={() => void handleCommit()}
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
                )}

                {result && (
                    <div>
                        <p className={styles.applied}>
                            Imported — {result.masterCreated} master{result.masterCreated === 1 ? "" : "s"},{" "}
                            {result.ticketCreated} ticket{result.ticketCreated === 1 ? "" : "s"}
                            {committedSkipped > 0 && `, ${committedSkipped} skipped`}. A pre-import
                            backup was saved to your downloads first.
                        </p>
                        {result.failed.length > 0 && (
                            <>
                                <p className={styles.bad}>{result.failed.length} row(s) failed:</p>
                                <ul className={styles.skipList}>
                                    {result.failed.map((f, i) => (
                                        <li key={i}>
                                            {f.label} — {f.message}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
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
