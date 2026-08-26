import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { LegacyImportFileRow } from "./LegacyImportFileRow";
import { LegacyImportPlanPreview } from "./LegacyImportPlanPreview";
import { LegacyImportResultSummary } from "./LegacyImportResultSummary";
import { useLegacyImportActions } from "./useLegacyImportActions";

// A "legacy v1/v2 import" — a one-time tool for a
// site moving off VaultBill (the older desktop products, v1/v2)
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
// (the "portable bundle" language, reused here even though this
// isn't that richer NDJSON format) — gated by `unlocked` for the commit
// step only, same asymmetry as BackupRestoreCard's own save-vs-restore
// split: previewing a file is read-only and safe at any time, committing
// touches masters and tickets in bulk and needs the admin password.
export const LegacyImportCard = () => {
    const db = useDataPort();
    const { unlocked } = useSettings();
    const { t } = useTranslation();
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
        <Card
            title={<span className="lbl">{t("settings.legacyImport.title")}</span>}>
            <div className={styles.body}>
                <LegacyImportFileRow
                    inputRef={inputRef}
                    fileName={fileName}
                    hasResult={result !== null}
                    committing={committing}
                    onFile={(file) => void handleFile(file)}
                    onClear={reset}
                />

                {loadingPlan && (
                    <p className={styles.hint}>{t("settings.legacyImport.readingExisting")}</p>
                )}
                {parseError && (
                    <p className={styles.bad}>
                        {t("settings.legacyImport.couldntReadPrefix")} {parseError}
                    </p>
                )}

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

                <p className={styles.hint}>{t("settings.legacyImport.hint")}</p>
            </div>
        </Card>
    );
};
