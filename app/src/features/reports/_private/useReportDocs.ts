import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { DocRow } from "@db/types";

export interface UseReportDocsResult {
    docs: DocRow[];
    /** True until the first `listDocs` resolves — lets ReportsScreen show a spinner instead of an empty table on first paint (docs/CodingStandards.md §9). */
    loading: boolean;
}

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the ticket-docs load effect, unchanged from
// the inline version it replaces except for the added `loading` flag.
export const useReportDocs = (db: DataPort): UseReportDocsResult => {
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) {
                setDocs(rows);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    return { docs, loading };
};
