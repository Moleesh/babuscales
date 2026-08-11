import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";
import type { DocRow } from "@db/types";

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the ticket-docs load effect, unchanged from
// the inline version it replaces.
export const useReportDocs = (db: DataPort): DocRow[] => {
    const [docs, setDocs] = useState<DocRow[]>([]);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    return docs;
};
