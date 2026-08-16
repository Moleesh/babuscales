import { useEffect, useState } from "react";

import type { MasterKind, MasterRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useMasterCache } from "@db/useMasterCache";
import type { MasterColumn } from "@engines/schemaEngine";

import { emptyForm } from "./masterFormState";
import { useMasterFormActions } from "./useMasterFormActions";
import { useMasterListPage } from "./useMasterListPage";

// Wires MastersScreen's two data sources — useMasterCache (record
// selection/editing, unchanged) and useMasterListPage (the keyset-paginated
// visible list, PLAN §21) — plus the form-action handlers, into one object
// so the screen component itself stays under the line budget
// (docs/CodingStandards.md).
export const useMastersScreenState = (activeKind: MasterKind, columns: MasterColumn[], query: string) => {
    const db = useDataPort();
    const { rows, save, reload } = useMasterCache(activeKind);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());
    // `rows` (useMasterCache) holds the whole kind for any shop small enough
    // that it fits in one cache page (PLAN §21, useMasterCache.ts) — the
    // common case, and `totalCount` below is exact for it. Past that page
    // size `rows` only grows as searches merge more in, so `totalCount`
    // becomes a lower bound rather than the true count; a real count query
    // would need its own DataPort method, deferred until a kind that large
    // is an actual reported problem rather than a hypothetical one.
    const selected: MasterRow | null = selectedId
        ? (rows.find((row) => row.MasterId === selectedId) ?? null)
        : null;
    const formActions = useMasterFormActions({ activeKind, columns, selected, form, setForm, setSelectedId, save });
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
