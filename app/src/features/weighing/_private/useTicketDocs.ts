import { useEffect, useState } from "react";

import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";

export interface UseTicketDocs {
    allTicketDocs: DocRow[];
    /** True until the first `listDocs` resolves — lets WeighingScreen show a spinner in the open-ticket strip instead of a silent, unresponsive-looking gap while this (currently unbounded) fetch is in flight. Mirrors `useReportDocs`'s own `loading` flag. */
    loading: boolean;
    bumpRefresh: () => void;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the whole-ticket-list load that backs both the open-ticket strip and
// buildRecallOffers. `bumpRefresh` is what handleSave/useTicketDelivery
// call once a save or print actually changes what's on disk; nothing else
// in WeighingScreen still needs `db` once this effect owns it.
export const useTicketDocs = (): UseTicketDocs => {
    const db = useDataPort();
    const [allTicketDocs, setAllTicketDocs] = useState<DocRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshToken, setRefreshToken] = useState(0);

    useEffect(() => {
        let cancelled = false;
        // Only the very first load (and an explicit `bumpRefresh`) shows the
        // spinner — a save/print refresh underneath an already-populated
        // strip shouldn't flash it away and back.
        setLoading(true);
        // `Limit` bounds this to the most recent slice (server orders
        // `created_at DESC` — see store/docs.rs) instead of scanning every
        // ticket doc ever created on every mount and every save/print
        // refresh. 5000 is generous for realistic history depths recall
        // needs to look back through (open-ticket resume, stored-tare/fill
        // lookups in recall.ts); a proper server-side "find by vehicle"
        // query would be the real long-term fix but is out of scope here.
        void db.listDocs({ DocKind: "Ticket", Limit: 5000 }).then((rows) => {
            if (cancelled) return;
            setAllTicketDocs(rows);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [db, refreshToken]);

    return { allTicketDocs, loading, bumpRefresh: () => setRefreshToken((n) => n + 1) };
};
