import { useState } from "react";

import type { MasterDraft, MasterKind, MasterRow } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

import { buildMasterBody, validateMasterFormNumbers } from "./masterFormBody";
import type { MasterFormState } from "./masterFormState";
import { emptyForm, formFromRow } from "./masterFormState";

export interface UseMasterFormActionsArgs {
    activeKind: MasterKind;
    columns: MasterColumn[];
    selected: MasterRow | null;
    form: MasterFormState;
    setForm: (form: MasterFormState) => void;
    setSelected: (row: MasterRow | null) => void;
    save: (draft: MasterDraft) => Promise<MasterRow>;
    /** Hard delete (task: "we need an option to remove the rows in master") — `useMasterCache`'s own `remove`. */
    remove: (masterId: string) => Promise<void>;
    /** `useMasterCache`'s own `rows` for this kind — used only for the client-side duplicate-name check before creating a *new* master. */
    cacheRows: MasterRow[];
}

export interface UseMasterFormActions {
    saving: boolean;
    error: string | null;
    selectRow: (row: MasterRow) => void;
    startNew: () => void;
    handleSave: () => Promise<void>;
    toggleActive: () => Promise<void>;
    handleDelete: () => Promise<void>;
}

// `toggleActive` and `handleDelete` share the same "act on `selected`, then
// bail if there isn't one" shape — pulled `toggleActive` out to a plain
// helper (rather than inline in the hook body) purely to keep
// `useMasterFormActions` itself under the file's own line budget
// (docs/CodingStandards.md), now that `handleDelete` has grown it past 60
// lines.
interface BuildToggleActiveArgs {
    activeKind: MasterKind;
    selected: MasterRow | null;
    save: (draft: MasterDraft) => Promise<MasterRow>;
    selectRow: (row: MasterRow) => void;
    setSaving: (saving: boolean) => void;
}

const buildToggleActive = ({
    activeKind,
    selected,
    save,
    selectRow,
    setSaving,
}: BuildToggleActiveArgs): (() => Promise<void>) => {
    return async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const row = await save({
                MasterId: selected.MasterId,
                MasterKind: activeKind,
                Name: selected.Name,
                Body: selected.Body,
                IsActive: !selected.IsActive,
            });
            selectRow(row);
        } finally {
            setSaving(false);
        }
    };
};

// Hard delete, distinct from `toggleActive` above — task: "we need an
// option to remove the rows in master". The confirm prompt itself lives in
// the button component (MasterFormActions.tsx), not here, so this stays
// "the row is gone, no second-guessing" once called. Pulled out alongside
// `buildToggleActive` to keep `useMasterFormActions` itself under budget.
const buildHandleDelete = (
    selected: MasterRow | null,
    remove: (masterId: string) => Promise<void>,
    startNew: () => void,
    setSaving: (saving: boolean) => void,
): (() => Promise<void>) => {
    return async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await remove(selected.MasterId);
            startNew();
        } finally {
            setSaving(false);
        }
    };
};

// The app's own convention (DataPort.ts's doc comment) is that ticket
// captures match masters "by name" — a duplicate Name within a Kind creates
// ambiguity about which record a capture should resolve to. Checked
// client-side against the already-loaded cache (`cacheRows`, useMasterCache's
// "load once" rows for this kind) rather than a new backend query — only
// applies when creating a *new* master (`selectedId` undefined); renaming an
// existing one to match itself isn't a collision.
const findDuplicateName = (
    cacheRows: MasterRow[],
    name: string,
    selectedId: string | undefined,
): boolean => {
    const target = name.trim().toLowerCase();
    return cacheRows.some(
        (row) => row.MasterId !== selectedId && row.Name.trim().toLowerCase() === target,
    );
};

// Pulled out of the hook body (below) purely to keep `useMasterFormActions`
// itself under the file's own line budget (docs/CodingStandards.md) now
// that numeric-validation and duplicate-name checks have grown `handleSave`
// past 60 lines. Validates before calling `save`, surfacing the first
// problem found (empty name / invalid number / duplicate name) via
// `setError` instead of silently coercing or allowing an ambiguous record.
interface BuildHandleSaveArgs {
    activeKind: MasterKind;
    columns: MasterColumn[];
    selected: MasterRow | null;
    form: MasterFormState;
    cacheRows: MasterRow[];
    save: (draft: MasterDraft) => Promise<MasterRow>;
    selectRow: (row: MasterRow) => void;
    setSaving: (saving: boolean) => void;
    setError: (error: string | null) => void;
}

const buildHandleSave = ({
    activeKind,
    columns,
    selected,
    form,
    cacheRows,
    save,
    selectRow,
    setSaving,
    setError,
}: BuildHandleSaveArgs): (() => Promise<void>) => {
    return async () => {
        const name = form.name.trim();
        if (!name) return;
        const numberError = validateMasterFormNumbers(activeKind, form, columns);
        if (numberError) {
            setError(numberError);
            return;
        }
        if (!selected && findDuplicateName(cacheRows, name, undefined)) {
            setError("masters.error.duplicateName");
            return;
        }
        setError(null);
        setSaving(true);
        try {
            const row = await save({
                MasterId: selected?.MasterId,
                MasterKind: activeKind,
                Name: name,
                Body: buildMasterBody(activeKind, form, columns),
                IsActive: selected?.IsActive,
            });
            selectRow(row);
        } finally {
            setSaving(false);
        }
    };
};

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the row-select/save/toggle-active handlers,
// unchanged from the inline version it replaces.
export const useMasterFormActions = ({
    activeKind,
    columns,
    selected,
    form,
    setForm,
    setSelected,
    save,
    remove,
    cacheRows,
}: UseMasterFormActionsArgs): UseMasterFormActions => {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectRow = (row: MasterRow): void => {
        setSelected(row);
        setForm(formFromRow(row, columns));
        setError(null);
    };

    const startNew = (): void => {
        setSelected(null);
        setForm(emptyForm());
        setError(null);
    };

    const handleSave = buildHandleSave({
        activeKind,
        columns,
        selected,
        form,
        cacheRows,
        save,
        selectRow,
        setSaving,
        setError,
    });
    const toggleActive = buildToggleActive({ activeKind, selected, save, selectRow, setSaving });
    const handleDelete = buildHandleDelete(selected, remove, startNew, setSaving);

    return { saving, error, selectRow, startNew, handleSave, toggleActive, handleDelete };
};
