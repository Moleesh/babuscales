import { useState } from "react";

import type { MasterDraft, MasterKind, MasterRow } from "@db/types";

import { buildMasterBody } from "./masterFormBody";
import type { MasterFormState } from "./masterFormState";
import { emptyForm, formFromRow } from "./masterFormState";

export interface UseMasterFormActionsArgs {
    activeKind: MasterKind;
    selected: MasterRow | null;
    form: MasterFormState;
    setForm: (form: MasterFormState) => void;
    setSelectedId: (id: string | null) => void;
    save: (draft: MasterDraft) => Promise<MasterRow>;
}

export interface UseMasterFormActions {
    saving: boolean;
    selectRow: (row: MasterRow) => void;
    startNew: () => void;
    handleSave: () => Promise<void>;
    toggleActive: () => Promise<void>;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the row-select/save/toggle-active handlers,
// unchanged from the inline version it replaces.
export const useMasterFormActions = ({
    activeKind,
    selected,
    form,
    setForm,
    setSelectedId,
    save,
}: UseMasterFormActionsArgs): UseMasterFormActions => {
    const [saving, setSaving] = useState(false);

    const selectRow = (row: MasterRow): void => {
        setSelectedId(row.MasterId);
        setForm(formFromRow(row));
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
                Body: buildMasterBody(activeKind, form),
                IsActive: selected?.IsActive,
            });
            selectRow(row);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (): Promise<void> => {
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

    return { saving, selectRow, startNew, handleSave, toggleActive };
};
