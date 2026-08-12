import { useEffect, useState } from "react";

import type { MasterKind, MasterRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useMasterCache } from "@db/useMasterCache";

import { emptyForm } from "./masterFormState";
import { useMasterFormActions } from "./useMasterFormActions";
import { useMasterListPage } from "./useMasterListPage";

// Wires MastersScreen's two data sources — useMasterCache (record
// selection/editing, unchanged) and useMasterListPage (the keyset-paginated
// visible list, PLAN §21) — plus the form-action handlers, into one object
// so the screen component itself stays under the line budget
// (docs/CodingStandards.md).
export const useMastersScreenState = (activeKind: MasterKind, query: string) => {
    const db = useDataPort();
    const { rows, save, reload } = useMasterCache(activeKind);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());
    // `rows` (useMasterCache) always holds the whole kind, so a row picked
    // from the paginated list below is still found here for editing.
    const selected: MasterRow | null = selectedId
        ? (rows.find((row) => row.MasterId === selectedId) ?? null)
        : null;
    const formActions = useMasterFormActions({ activeKind, selected, form, setForm, setSelectedId, save });
    const { rows: pageRows, loading, hasMore, loadingMore, loadMore } = useMasterListPage(db, activeKind, query);

    useEffect(() => {
        setSelectedId(null);
        setForm(emptyForm());
    }, [activeKind]);

    return {
        totalCount: rows.length,
        reload,
        list: { rows: pageRows, loading, hasMore, loadingMore, loadMore, onRowClick: formActions.selectRow },
        form: {
            selected,
            form,
            onChange: setForm,
            saving: formActions.saving,
            onSave: () => void formActions.handleSave(),
            onToggleActive: () => void formActions.toggleActive(),
            onStartNew: formActions.startNew,
        },
    };
};
