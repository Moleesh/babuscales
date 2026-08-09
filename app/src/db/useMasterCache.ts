import { useCallback, useEffect, useState } from "react";

import type { MasterDraft, MasterKind, MasterRow } from "./types";
import { useDataPort } from "./useDataPort";

export interface UseMasterCache {
    rows: MasterRow[];
    loading: boolean;
    /** Client-side substring match against the already-loaded rows — instant, no round-trip per keystroke (PLAN §9.1). Real FTS5 filtering is the Tauri/SQLite adapter's job once it exists (app/README.md known gap). */
    search: (query: string) => MasterRow[];
    save: (draft: MasterDraft) => Promise<MasterRow>;
    reload: () => void;
}

// One kind's worth of masters, loaded once and kept in memory so every
// keystroke in a search box or SearchableDropdown filters locally instead
// of round-tripping DataPort (PLAN §9.1 "no lag"). `save` reloads the cache
// so a newly added master is searchable immediately.
export const useMasterCache = (kind: MasterKind): UseMasterCache => {
    const db = useDataPort();
    const [rows, setRows] = useState<MasterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        void db.listMasters({ MasterKind: kind }).then((result) => {
            if (cancelled) return;
            setRows(result);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [db, kind, reloadToken]);

    const search = useCallback(
        (query: string) => {
            const q = query.trim().toLowerCase();
            if (!q) return rows;
            return rows.filter((row) => row.Name.toLowerCase().includes(q));
        },
        [rows],
    );

    const save = useCallback(
        async (draft: MasterDraft) => {
            const row = await db.saveMaster(draft);
            setReloadToken((t) => t + 1);
            return row;
        },
        [db],
    );

    const reload = useCallback(() => setReloadToken((t) => t + 1), []);

    return { rows, loading, search, save, reload };
};
