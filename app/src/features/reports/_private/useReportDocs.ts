import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { DocRow } from "@db/types";

export interface UseReportDocsResult {
    docs: DocRow[];
    /** True until the first `listDocs` resolves — lets ReportsScreen show a spinner instead of an empty table on first paint (docs/CodingStandards.md §9). */
    loading: boolean;
}

// Module-level, not component state: App.tsx's tab switch (a plain `switch`
// returning one screen) fully unmounts ReportsScreen on every tab change, so
// component state alone can't survive a trip to Weighing and back — every
// return re-ran `listDocs` against the *entire* ticket table from a blank
// slate, which is exactly the "lag switching tabs, because of Reports data"
// the tickets have kept coming back to. Caching the last-fetched rows here
// (outside React, so a remount can see them) lets the next mount paint
// instantly from cache while a fresh fetch updates it silently underneath —
// classic stale-while-revalidate. Trade-off: this is one cache per DataPort
// instance for the process's lifetime, never invalidated on write — new
// tickets closed elsewhere only show up on the *next* natural refetch this
// causes, not immediately. Acceptable here since every doc-mutating flow
// (Weighing) already returns you to Reports through a tab switch, which is
// exactly what triggers the background revalidate.
const cache = new WeakMap<DataPort, DocRow[]>();

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the ticket-docs load effect.
export const useReportDocs = (db: DataPort): UseReportDocsResult => {
    const cached = cache.get(db);
    const [docs, setDocs] = useState<DocRow[]>(cached ?? []);
    // Only block on a spinner the very first time this DataPort has never
    // been fetched — every later remount already has something to paint.
    const [loading, setLoading] = useState(cached === undefined);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (cancelled) return;
            cache.set(db, rows);
            setDocs(rows);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    return { docs, loading };
};
