import { useState } from "react";

import type { MasterDraft, MasterKind, MasterRow } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

import { buildMasterBody } from "./masterFormBody";
import type { MasterFormState } from "./masterFormState";
import { emptyForm, formFromRow } from "./masterFormState";

export interface UseMasterFormActionsArgs {
    activeKind: MasterKind;
    columns: MasterColumn[];
    selected: MasterRow | null;
    form: MasterFormState;
    setForm: (form: MasterFormState) => void;
    setSelectedId: (id: string | null) => void;
    save: (draft: MasterDraft) => Promise<MasterRow>;
    /** Hard delete (task: "we need an option to remove the rows in master") — `useMasterCache`'s own `remove`. */
    remove: (masterId: string) => Promise<void>;
}

export interface UseMasterFormActions {
    saving: boolean;
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

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the row-select/save/toggle-active handlers,
// unchanged from the inline version it replaces.
export const useMasterFormActions = ({
    activeKind,
    columns,
    selected,
    form,
    setForm,
    setSelectedId,
    save,
    remove,
}: UseMasterFormActionsArgs): UseMasterFormActions => {
    const [saving, setSaving] = useState(false);

    const selectRow = (row: MasterRow): void => {
        setSelectedId(row.MasterId);
        setForm(formFromRow(row, columns));
    };

    const startNew = (): void => {
        setSelectedId(null);
        setForm(emptyForm());
    };

    const handleSave = async (): Promise<void> => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const row = await save({
                MasterId: selected?.MasterId,
                MasterKind: activeKind,
                Name: form.name.trim(),
                Body: buildMasterBody(activeKind, form, columns),
                IsActive: selected?.IsActive,
            });
            selectRow(row);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = buildToggleActive({ activeKind, selected, save, selectRow, setSaving });
    const handleDelete = buildHandleDelete(selected, remove, startNew, setSaving);

    return { saving, selectRow, startNew, handleSave, toggleActive, handleDelete };
};
