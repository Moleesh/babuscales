import { useCallback, useEffect, useRef, useState } from "react";

import type { MasterDraft, MasterKind, MasterRow } from "./types";
import { useDataPort } from "./useDataPort";

export interface UseMasterCache {
    rows: MasterRow[];
    loading: boolean;
    /** Client-side substring match against the loaded rows — instant, no round-trip per keystroke. Once a kind is confirmed larger than one cache page this also kicks off a background DataPort search for novel terms and merges it in, so the *next* call (next keystroke/render) can find rows this call couldn't yet see — see the module comment below. */
    search: (query: string) => MasterRow[];
    save: (draft: MasterDraft) => Promise<MasterRow>;
    reload: () => void;
}

// A kind can run into the tens/hundreds of thousands of rows (vehicles,
// parties) at a busy site over years — loading every one of them up front
// doesn't scale. This instead loads one bounded page
// (CACHE_LIMIT) eagerly, which covers every shop small enough that the
// whole kind fits in a page — the overwhelmingly common case, and identical
// in behaviour to the old "load everything" cache for it. Only once a kind
// is confirmed bigger than that page (`cappedRef`) does `search` fall back
// to a real DataPort query per novel term, merging the result into the
// cache so a later render's synchronous filter picks it up. `search` itself
// stays synchronous throughout — its two callers (SearchableDropdown via
// TicketFieldsCard/SchemaFieldRow, and buildRecallOffers.ts) both call it
// inline during render/computation and can't await a promise — so this is
// "best effort now, better a moment later" once a kind is actually large,
// not "always instantly complete." `MAX_ROWS` bounds how far merging can
// grow the cache, trimming the oldest-added rows first so memory stays
// bounded even after a long session of varied searches on a huge kind.
const CACHE_LIMIT = 2000;
const SEARCH_LIMIT = 200;
const MAX_ROWS = 5000;

export const useMasterCache = (kind: MasterKind): UseMasterCache => {
    const db = useDataPort();
    const [rows, setRows] = useState<MasterRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);
    // Plain refs, not state: they gate whether `search` fires a background
    // fetch, and reading a stale value for one call just means "try again
    // next keystroke" — not worth the extra re-renders that state would add.
    const cappedRef = useRef(false);
    const searchedRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        cappedRef.current = false;
        searchedRef.current = new Set();
        void db.listMasters({ MasterKind: kind, Limit: CACHE_LIMIT }).then((result) => {
            if (cancelled) return;
            cappedRef.current = result.length >= CACHE_LIMIT;
            setRows(result);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [db, kind, reloadToken]);

    // Fire-and-forget merge target for the background search below — kept
    // separate so `search` can stay a plain synchronous function.
    const mergeFound = useCallback((found: MasterRow[]) => {
        if (found.length === 0) return;
        setRows((prev) => {
            const seen = new Set(prev.map((row) => row.MasterId));
            const additions = found.filter((row) => !seen.has(row.MasterId));
            if (additions.length === 0) return prev;
            const merged = [...prev, ...additions];
            return merged.length > MAX_ROWS ? merged.slice(merged.length - MAX_ROWS) : merged;
        });
    }, []);

    const search = useCallback(
        (query: string) => {
            const q = query.trim().toLowerCase();
            if (!q) return rows;
            // 2+ chars: a single letter on a huge kind would round-trip
            // hundreds of near-useless matches on every field's first
            // keystroke. `searchedRef` then makes it once-per-term for the
            // life of this cache, not once-per-keystroke.
            if (cappedRef.current && q.length >= 2 && !searchedRef.current.has(q)) {
                searchedRef.current.add(q);
                void db
                    .listMasters({ MasterKind: kind, Search: query.trim(), Limit: SEARCH_LIMIT })
                    .then(mergeFound);
            }
            return rows.filter((row) => row.Name.toLowerCase().includes(q));
        },
        [rows, db, kind, mergeFound],
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
