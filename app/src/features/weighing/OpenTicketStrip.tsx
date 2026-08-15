import { Spinner } from "@components/Spinner";
import { formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/OpenTicketStrip.module.css";
import type { OpenTicketSummary } from "./recall";
import { formatTicketNo } from "./ticketNumber";

export interface OpenTicketStripProps {
    tickets: OpenTicketSummary[];
    /** True until the first ticket-docs fetch resolves — see `useTicketDocs`. Distinguishes "still loading" from "genuinely nothing open" so the strip doesn't just silently vanish while the deck is loading. */
    loading: boolean;
    onResume: (ticket: OpenTicketSummary) => void;
    /** Settings' `Formats.WeightUnit`. */
    weightUnit: WeightUnit;
}

// PLAN §7.5 — "many lorries in flight": every parked, one-weight ticket,
// always visible so the operator can pick the lorry back up the moment it
// returns to the deck, without hunting through Reports for it.
export const OpenTicketStrip = ({ tickets, loading, onResume, weightUnit }: OpenTicketStripProps) => {
    const { t } = useTranslation();
    if (tickets.length === 0 && !loading) return null;

    return (
        <div className={styles.strip}>
            <span className="lbl">{t("weigh.open")}</span>
            {loading && tickets.length === 0 ? (
                <span className={styles.loading}>
                    <Spinner size="sm" label={t("weigh.loadingTickets")} /> {t("weigh.loadingTickets")}
                </span>
            ) : null}
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
                        {t(ticket.kind === "Tare" ? "tare" : "gross")}{" "}
                        {formatWeightIn(ticket.weightKg, weightUnit)}
                    </span>
                </button>
            ))}
        </div>
    );
};
