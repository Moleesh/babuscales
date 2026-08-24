import { useLayoutEffect, useRef, useState } from "react";

import type { ReportDefinition } from "@db/reportDefs";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/SavedReportsRow.module.css";

export interface SavedReportsRowProps {
    savedReports: ReportDefinition[];
    /** `def.Id` of whichever saved view is currently applied, or `null` —
     * `null` on landing (Reports rework: "no report selected by default"). */
    selectedId: string | null;
    onRecall: (def: ReportDefinition) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, name: string) => void;
}

// Closes the popover on an outside click — same shape as components/Select's
// own `useCloseOnOutsideClick`, duplicated here rather than imported since
// Select doesn't export it and this dropdown's per-row edit/delete actions
// make it enough of a variant to not just wrap Select directly.
const useCloseOnOutsideClick = (open: boolean, onClose: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
        // Task: "on scroll close all the dropdowns" — same reasoning as
        // Select.tsx's own copy of this hook, including the `contains` guard
        // so scrolling the popover's own row list doesn't close it.
        const onScroll = (event: Event) => {
            if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return;
            onClose();
        };
        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [open, onClose]);
    return ref;
};

interface SavedViewRowProps {
    def: ReportDefinition;
    active: boolean;
    editing: boolean;
    editValue: string;
    onEditValueChange: (name: string) => void;
    onPick: () => void;
    onStartEdit: () => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
}

// One row of the open popover: either the plain recall button + pencil/trash
// actions, or (mid-rename) a text input replacing the label — split out
// purely to keep SavedReportsRow itself under the file's own line budget.
const SavedViewRow = ({
    def,
    active,
    editing,
    editValue,
    onEditValueChange,
    onPick,
    onStartEdit,
    onCommitEdit,
    onCancelEdit,
    onDelete,
}: SavedViewRowProps) => {
    const { t } = useTranslation();
    if (editing) {
        return (
            <div className={styles.optionRow}>
                <input
                    className={styles.renameInput}
                    value={editValue}
                    autoFocus
                    onChange={(event) => onEditValueChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") onCommitEdit();
                        if (event.key === "Escape") onCancelEdit();
                    }}
                    onBlur={onCommitEdit}
                    aria-label={t("reports.savedReportsNewAriaLabel")}
                />
            </div>
        );
    }
    return (
        <div className={`${styles.optionRow} ${active ? styles.optionRowActive : ""}`}>
            <button type="button" className={styles.option} data-cursor="compact" onClick={onPick}>
                {def.Name}
            </button>
            <button
                type="button"
                className={styles.iconBtn}
                data-cursor="compact"
                aria-label={`${t("reports.savedReportsEditPrefix")} ${def.Name}`}
                onClick={onStartEdit}
            >
                ✎
            </button>
            <button
                type="button"
                className={styles.iconBtn}
                data-cursor="compact"
                aria-label={`${t("reports.savedReportsDeletePrefix")} ${def.Name}`}
                onClick={onDelete}
            >
                ×
            </button>
        </div>
    );
};

// Task #54's saved-report-definitions control, redone as a single dropdown
// (Reports rework, item 1) — a row of chips crowded the same line as the
// "Save current view as…" input once there were more than a couple of saved
// views. "A little customized" over components/Select: each row carries an
// edit (rename) and delete action alongside the plain recall click, which a
// bare `<select>`/`Select` can't do. Placed on the same sticky filter line
// as the date pickers (ReportsCardBody.tsx) instead of its own row.
interface SavedViewsListProps {
    savedReports: ReportDefinition[];
    selectedId: string | null;
    editingId: string | null;
    editValue: string;
    onEditValueChange: (name: string) => void;
    onCommitEdit: () => void;
    onCancelEdit: () => void;
    onStartEdit: (def: ReportDefinition) => void;
    onPick: (def: ReportDefinition) => void;
    onDelete: (id: string) => void;
}

// The open popover's row list — split out of SavedReportsRow purely to keep
// it under the file's own line budget (docs/CodingStandards.md).
const SavedViewsList = ({
    savedReports,
    selectedId,
    editingId,
    editValue,
    onEditValueChange,
    onCommitEdit,
    onCancelEdit,
    onStartEdit,
    onPick,
    onDelete,
}: SavedViewsListProps) => {
    const { t } = useTranslation();
    return (
        <div className={styles.list} role="listbox">
            {savedReports.length === 0 && <div className={styles.empty}>{t("reports.savedReportsNone")}</div>}
            {savedReports.map((def) => (
                <SavedViewRow
                    key={def.Id}
                    def={def}
                    active={def.Id === selectedId}
                    editing={editingId === def.Id}
                    editValue={editValue}
                    onEditValueChange={onEditValueChange}
                    onPick={() => onPick(def)}
                    onStartEdit={() => onStartEdit(def)}
                    onCommitEdit={onCommitEdit}
                    onCancelEdit={onCancelEdit}
                    onDelete={() => onDelete(def.Id)}
                />
            ))}
        </div>
    );
};

// The inline "Save current view as…" input + "Save view" button used to
// live here (`NewViewInput`) — removed per user feedback: "remove save view
// as and save view". Saving a named view now only happens through the
// report-builder wizard's own save row (ReportBuilderSaveRow.tsx, wired via
// ReportBuilderModal's `onSaveReport` -> useSavedReportActions'
// `handleSaveReportDraft`), which already saves *and* applies a report in
// one action — this row now only recalls/renames/deletes what's already
// saved.

export const SavedReportsRow = ({
    savedReports,
    selectedId,
    onRecall,
    onDelete,
    onRename,
}: SavedReportsRowProps) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const ref = useCloseOnOutsideClick(open, () => {
        setOpen(false);
        setEditingId(null);
    });
    const selected = savedReports.find((def) => def.Id === selectedId);

    const commitEdit = (): void => {
        if (editingId) onRename(editingId, editValue);
        setEditingId(null);
    };

    return (
        <div className={styles.wrap} ref={ref}>
            <button
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.label}>{selected?.Name ?? t("reports.savedReportsPlaceholder2")}</span>
                <span className={styles.chevron} aria-hidden="true">▾</span>
            </button>
            {open && (
                <SavedViewsList
                    savedReports={savedReports}
                    selectedId={selectedId}
                    editingId={editingId}
                    editValue={editValue}
                    onEditValueChange={setEditValue}
                    onCommitEdit={commitEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onStartEdit={(def) => {
                        setEditingId(def.Id);
                        setEditValue(def.Name);
                    }}
                    onPick={(def) => {
                        onRecall(def);
                        setOpen(false);
                    }}
                    onDelete={onDelete}
                />
            )}
        </div>
    );
};
