import { useRef, useState } from "react";
import type { RefObject } from "react";

import { timestampForFilename } from "@constants/timestampForFilename";
import type { DataPort } from "@db/DataPort";
import { parseLegacyBundle } from "@engines/importEngine/legacyImportBundle";
import { planLegacyImport } from "@engines/importEngine/legacyImportPlan";
import type { LegacyImportPlan } from "@engines/importEngine/legacyImportPlan";

import { commitLegacyImport, loadExistingState } from "./legacyImportRun";
import type { LegacyImportRunResult } from "./legacyImportRun";

export interface LegacyImportKindCount {
    kind: string;
    count: number;
}

export interface UseLegacyImportActions {
    fileName: string | null;
    parseError: string | null;
    plan: LegacyImportPlan | null;
    loadingPlan: boolean;
    committing: boolean;
    result: LegacyImportRunResult | null;
    committedSkipped: number;
    inputRef: RefObject<HTMLInputElement | null>;
    toCreate: number;
    kindCounts: LegacyImportKindCount[];
    reset: () => void;
    handleFile: (file: File) => Promise<void>;
    handleCommit: () => Promise<void>;
}

// Downloads a restore-point backup before writing anything — an import that
// goes wrong halfway through should never be a worse position than "restore
// this file and try again" (PLAN §14). Plain function (no hooks) so it
// doesn't count against useLegacyImportActions's own line budget.
const downloadPreImportBackup = async (db: DataPort): Promise<void> => {
    const bytes = await db.exportBackup();
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `babuscales-pre-import-${timestampForFilename()}.bak`;
    link.click();
    URL.revokeObjectURL(url);
};

// Parses the chosen file and plans the import against what's already here —
// plain function (no hooks) so it doesn't count against
// useLegacyImportActions's own line budget.
const buildLegacyPlan = async (db: DataPort, file: File): Promise<LegacyImportPlan> => {
    const bundle = parseLegacyBundle(JSON.parse(await file.text()));
    const existing = await loadExistingState(db);
    return planLegacyImport(bundle, existing);
};

// Per-kind create counts for the preview list — plain function (no hooks)
// so it doesn't count against useLegacyImportActions's own line budget.
const computeKindCounts = (plan: LegacyImportPlan | null): LegacyImportKindCount[] =>
    plan
        ? Object.entries(
              plan.masterDrafts.reduce<Record<string, number>>((acc, { kind }) => {
                  acc[kind] = (acc[kind] ?? 0) + 1;
                  return acc;
              }, {}),
          ).map(([kind, count]) => ({ kind, count }))
        : [];

// Split out of LegacyImportCard (over the line budget — docs/CodingStandards.md)
// — every stateful piece and the parse/commit handlers, unchanged from the
// inline versions they replace.
export const useLegacyImportActions = (db: DataPort): UseLegacyImportActions => {
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
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleFile = async (file: File): Promise<void> => {
        reset();
        setFileName(file.name);
        setLoadingPlan(true);
        try {
            setPlan(await buildLegacyPlan(db, file));
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
            await downloadPreImportBackup(db);
            const runResult = await commitLegacyImport(db, plan);
            setCommittedSkipped(plan.skipped.length);
            setResult(runResult);
            setPlan(null);
        } finally {
            setCommitting(false);
        }
    };

    const toCreate = plan ? plan.masterDrafts.length + plan.ticketDrafts.length : 0;
    const kindCounts = computeKindCounts(plan);

    return {
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
    };
};
