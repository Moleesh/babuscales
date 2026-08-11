import { useEffect, useState } from "react";

import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";

export interface UseTicketDocs {
    allTicketDocs: DocRow[];
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
    const [refreshToken, setRefreshToken] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setAllTicketDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db, refreshToken]);

    return { allTicketDocs, bumpRefresh: () => setRefreshToken((n) => n + 1) };
};
