import type { RefObject } from "react";

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
    /** WeighingScreen's `useStickyStripHeight` measures this element's real
     * rendered height directly — this used to be a wrapper `<div>` around
     * `OpenTicketStrip`, but that put `.strip`'s (sticky) actual containing
     * block one level too deep (the wrapper's own tightly-fit box, not
     * `.screen`), capping its stick range at almost nothing. Passing the
     * ref straight onto `.strip` itself makes it a direct flex item of
     * `.screen` — same shape as AppShell's `.header-sticky`, which sticks
     * correctly for exactly this reason. */
    containerRef?: RefObject<HTMLDivElement | null>;
}

// "Many lorries in flight": every parked, one-weight ticket, always visible
// so the operator can pick the lorry back up the moment it returns to the
// deck, without hunting through Reports for it.
export const OpenTicketStrip = ({ tickets, loading, onResume, weightUnit, containerRef }: OpenTicketStripProps) => {
    const { t, lang } = useTranslation();
    if (tickets.length === 0 && !loading) return null;

    return (
        // `data-enter-skip` — task: "open segment should not be focusable".
        // useEnterAsTab.ts excludes anything inside a `[data-enter-skip]`
        // container from the Enter walk both as a source AND a destination,
        // so these resume buttons no longer pick up the Enter-walk's focus
        // ring while still staying reachable/clickable by mouse.
        <div className={styles.strip} ref={containerRef} data-enter-skip>
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
                        {t(ticket.kind === "Tare" ? "weigh.tare" : "weigh.gross")}{" "}
                        {formatWeightIn(ticket.weightKg, weightUnit, lang)}
                    </span>
                </button>
            ))}
        </div>
    );
};
