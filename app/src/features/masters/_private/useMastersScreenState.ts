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
// visible list) — plus the form-action handlers, into one object
// so the screen component itself stays under the line budget
// (docs/CodingStandards.md).
export const useMastersScreenState = (activeKind: MasterKind, columns: MasterColumn[], query: string) => {
    const db = useDataPort();
    const { rows, save, remove, reload, reloadToken } = useMasterCache(activeKind);
    // The selected row is stored directly — from whatever the user actually
    // clicked in the paginated list, or from what `save`/toggle-active just
    // wrote back — rather than re-looked-up by id in `rows` (useMasterCache's
    // separate, differently-paginated cache). A lookup there can miss the row
    // entirely (large kinds only carry a partial cache) or resolve to a
    // stale copy, so toggle/save would silently act on outdated data.
    const [selected, setSelected] = useState<MasterRow | null>(null);
    const [form, setForm] = useState(emptyForm());
    // `rows` (useMasterCache) holds the whole kind for any shop small enough
    // that it fits in one cache page (useMasterCache.ts) — the
    // common case, and `totalCount` below is exact for it. Past that page
    // size `rows` only grows as searches merge more in, so `totalCount`
    // becomes a lower bound rather than the true count; a real count query
    // would need its own DataPort method, deferred until a kind that large
    // is an actual reported problem rather than a hypothetical one.
    const formActions = useMasterFormActions({
        activeKind,
        columns,
        selected,
        form,
        setForm,
        setSelected,
        save,
        remove,
        cacheRows: rows,
    });
    // `reloadToken` bumps on every cache save/remove/reload — passed through
    // as this page's own refresh dependency so the visible (paginated) list
    // refetches its current page whenever the cache mutates, not just on
    // [db, kind, query] changes. Without this, Save/Delete/Toggle-Active/
    // Refresh all left the on-screen DataTable showing stale data.
    const { rows: pageRows, loading, hasMore, loadingMore, loadMore } = useMasterListPage(
        db,
        activeKind,
        query,
        reloadToken,
    );

    useEffect(() => {
        setSelected(null);
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
            error: formActions.error,
            onSave: () => void formActions.handleSave(),
            onDelete: () => void formActions.handleDelete(),
            onStartNew: formActions.startNew,
        },
    };
};
