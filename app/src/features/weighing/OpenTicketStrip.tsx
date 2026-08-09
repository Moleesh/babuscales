import { formatWeightKg } from "@constants/numberFormat";

import styles from "./OpenTicketStrip.module.css";
import type { OpenTicketSummary } from "./recall";
import { formatTicketNo } from "./ticketNumber";

export interface OpenTicketStripProps {
    tickets: OpenTicketSummary[];
    onResume: (ticket: OpenTicketSummary) => void;
}

// PLAN §7.5 — "many lorries in flight": every parked, one-weight ticket,
// always visible so the operator can pick the lorry back up the moment it
// returns to the deck, without hunting through Reports for it.
export const OpenTicketStrip = ({ tickets, onResume }: OpenTicketStripProps) => {
    if (tickets.length === 0) return null;

    return (
        <div className={styles.strip}>
            <span className="lbl">Open</span>
            {tickets.map((ticket) => (
                <button
                    key={ticket.doc.DocId}
                    type="button"
                    className={styles.item}
                    onClick={() => onResume(ticket)}
                >
                    <span>{formatTicketNo(ticket.doc.DocSeq)}</span>
                    <span>{ticket.body.VehicleNo || "—"}</span>
                    <span className={styles.weight}>
                        {ticket.kind} {formatWeightKg(ticket.weightKg)} kg
                    </span>
                </button>
            ))}
        </div>
    );
};
