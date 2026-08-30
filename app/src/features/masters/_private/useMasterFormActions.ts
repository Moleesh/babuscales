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
    /** `Schema.DecimalsAllowed ?? false` — gates whether a Money column/StoredTare weight may carry a fraction (see masterFormBody.ts). */
    decimalsAllowed: boolean;
}

export interface UseMasterFormActions {
    saving: boolean;
    error: string | null;
    selectRow: (row: MasterRow) => void;
    startNew: () => void;
    handleSave: () => Promise<void>;
    handleDelete: () => Promise<void>;
}

// Hard delete — task: "we need an option to remove the rows in master". The
// confirm prompt itself lives in the button component (MasterFormActions.tsx),
// not here, so this stays "the row is gone, no second-guessing" once called.
// Pulled out to keep `useMasterFormActions` itself under budget. (Its former
// sibling `buildToggleActive`/`toggleActive` was removed entirely — "we dont
// want deactivate in masters remove the whole logic and the column".)
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
// "load once" rows for this kind) rather than a new backend query — checked
// on both create and rename (`selectedId` passed through so a record
// matching itself, i.e. an unchanged rename, isn't flagged as a collision).
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
    decimalsAllowed: boolean;
    save: (draft: MasterDraft) => Promise<MasterRow>;
    startNew: () => void;
    setSaving: (saving: boolean) => void;
    setError: (error: string | null) => void;
}

const buildHandleSave = ({
    activeKind,
    columns,
    selected,
    form,
    cacheRows,
    decimalsAllowed,
    save,
    startNew,
    setSaving,
    setError,
}: BuildHandleSaveArgs): (() => Promise<void>) => {
    return async () => {
        const name = form.name.trim();
        if (!name) return;
        const numberError = validateMasterFormNumbers(activeKind, form, columns, decimalsAllowed);
        if (numberError) {
            setError(numberError);
            return;
        }
        if (findDuplicateName(cacheRows, name, selected?.MasterId)) {
            setError("masters.error.duplicateName");
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await save({
                ...(selected?.MasterId !== undefined ? { MasterId: selected.MasterId } : {}),
                MasterKind: activeKind,
                Name: name,
                Body: buildMasterBody(activeKind, form, columns),
                ...(selected?.IsActive !== undefined ? { IsActive: selected.IsActive } : {}),
            });
            // Task: "on save on the master go to new row, do not keep in
            // edit" — reset to a blank form instead of re-selecting the
            // just-saved row (was `selectRow(row)`).
            startNew();
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
    decimalsAllowed,
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
        decimalsAllowed,
        save,
        startNew,
        setSaving,
        setError,
    });
    const handleDelete = buildHandleDelete(selected, remove, startNew, setSaving);

    return { saving, error, selectRow, startNew, handleSave, handleDelete };
};
