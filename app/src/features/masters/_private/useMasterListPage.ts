import { useCallback, useEffect, useRef, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { MasterKind, MasterRow } from "@db/types";

const PAGE_SIZE = 50;

export interface UseMasterListPage {
    rows: MasterRow[];
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    loadMore: () => void;
}

// Keyset-paginated list for MastersListCard only ("Load more"). Independent
// of useMasterCache, which stays the "load
// everything once, filter every keystroke locally" source of truth for
// record-selection/form editing on this screen and for every
// SearchableDropdown elsewhere (useMasterCache.ts) — nothing here touches
// that hook. This one instead round-trips DataPort.listMasters per query
// change and per "Load more" click, using the last row's Name/MasterId as
// the next page's cursor (db/types.ts's MasterQuery.After).
export const useMasterListPage = (db: DataPort, kind: MasterKind, query: string): UseMasterListPage => {
    const [rows, setRows] = useState<MasterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const requestId = useRef(0);

    useEffect(() => {
        const id = ++requestId.current;
        setLoading(true);
        void db.listMasters({ MasterKind: kind, Search: query || undefined, Limit: PAGE_SIZE }).then((page) => {
            if (requestId.current !== id) return;
            setRows(page);
            setHasMore(page.length === PAGE_SIZE);
            setLoading(false);
        });
    }, [db, kind, query]);

    const loadMore = useCallback(() => {
        const last = rows[rows.length - 1];
        if (!last || loadingMore) return;
        const id = requestId.current;
        setLoadingMore(true);
        void db
            .listMasters({
                MasterKind: kind,
                Search: query || undefined,
                Limit: PAGE_SIZE,
                After: { Name: last.Name, MasterId: last.MasterId },
            })
            .then((page) => {
                if (requestId.current !== id) return;
                setRows((prev) => [...prev, ...page]);
                setHasMore(page.length === PAGE_SIZE);
                setLoadingMore(false);
            });
    }, [db, kind, query, rows, loadingMore]);

    return { rows, loading, loadingMore, hasMore, loadMore };
};
