import { useRef } from "react";
import type { RefObject } from "react";

import { ScrollArea } from "@components/ScrollArea";
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
    const contentRef = useRef<HTMLDivElement>(null);
    if (tickets.length === 0 && !loading) return null;

    return (
        // `data-enter-skip` — task: "open segment should not be focusable".
        // useEnterAsTab.ts excludes anything inside a `[data-enter-skip]`
        // container from the Enter walk both as a source AND a destination,
        // so these resume buttons no longer pick up the Enter-walk's focus
        // ring while still staying reachable/clickable by mouse.
        //
        // Task: "like how we solved the issue with dragging the vertical
        // scroll showing native cursor we need to fix the horizontal as
        // well" — this strip's own native `overflow-x: auto` had the same
        // dragging-the-thumb-shows-the-OS-cursor problem DataTable's
        // `.wrapper` used to (ScrollArea.tsx's own comment). Split into an
        // outer sticky/bordered box (`containerRef` still measures *this*
        // one — WeighingBody's sticky-height math cares about the whole
        // strip's rendered box, not just its scrolling interior) wrapping
        // ScrollArea, which owns the actual `overflow-x` + custom thumb.
        <div className={styles.strip} ref={containerRef} data-enter-skip>
            <ScrollArea contentRef={contentRef} contentClassName={styles.stripContent}>
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
                        // Task: "all tab should not be focusable and dont show
                        // border" — a plain click still gives a clicked <button>
                        // the browser's native focus/outline (screenshot: the
                        // just-resumed chip stayed ringed in orange after New/
                        // Send to Lorry moved on), on top of `data-enter-skip`
                        // above only ever having excluded these from the
                        // Enter-walk, not from focus outright. `tabIndex={-1}`
                        // takes them out of the tab order entirely; `.item:focus`
                        // below drops the outline for the mouse-click case
                        // tabIndex alone doesn't cover.
                        tabIndex={-1}
                        onClick={() => onResume(ticket)}
                    >
                        <span>{formatTicketNo(ticket.doc.DocSeq)}</span>
                        <span>{ticket.body.VehicleNo || "—"}</span>
                        <span className={styles.weight}>
                            {t(ticket.kind === "Tare" ? "weigh.label.tare" : "weigh.label.gross")}{" "}
                            {formatWeightIn(ticket.weightKg, weightUnit, lang)}
                        </span>
                    </button>
                ))}
            </ScrollArea>
        </div>
    );
};
