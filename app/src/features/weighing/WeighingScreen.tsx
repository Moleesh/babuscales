import { useState } from "react";

import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { useSettings } from "@features/settings";

import { PrintPreviewModal } from "./_private/PrintPreviewModal";
import { useDeliveryChannels } from "./_private/useDeliveryChannels";
import { useWeighingScreenDerived } from "./_private/useWeighingScreenDerived";
import { useWeighingScreenTickets } from "./_private/useWeighingScreenTickets";
import { WeighingBody } from "./_private/WeighingBody";
import { OpenTicketStrip } from "./OpenTicketStrip";
import type { UseWeighingTicket } from "./useWeighingTicket";
import styles from "./WeighingScreen.module.css";

const formatStamp = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleString() : "—";

export interface WeighingScreenProps {
    /** Lifted to Shell (PLAN §13.1) so Reports can resume a ticket into the same deck across a tab switch. */
    ticket: UseWeighingTicket;
    /**
     * `useLicense().isGated` (task #38) — the one place licence state
     * actually changes what the operator can do: a lapsed trial or invalid
     * code blocks new captures and Save, but never touches an
     * already-open ticket's fields, Reports, Dashboard or Masters — those
     * stay fully readable (and Print still works for whatever was already
     * saved) so a lapsed licence never locks an operator out of data
     * they're entitled to see, only out of adding more of it.
     */
    licenseGated: boolean;
}

// PLAN §7 end to end: an ordered capture array (§7.1), a stability-gated
// deck (§13), one status derived from the weights (§7.4), the open-ticket
// strip so many lorries can be in flight at once (§7.5), a simplified
// recall banner (§9.2), and the mock's own `camCard` sidebar (a decorative
// preview tied to this same ticket state — @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
export const WeighingScreen = ({ ticket, licenseGated }: WeighingScreenProps) => {
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const { settings } = useSettings();
    const { email, sms } = useDeliveryChannels();

    const [printModalOpen, setPrintModalOpen] = useState(false);

    const { caches, allTicketDocs, openTickets, bumpRefresh, handleResume, handleSave } =
        useWeighingScreenTickets(ticket);

    const { armed, recallOffers, billing, handlePrint, slipData } = useWeighingScreenDerived({
        ticket,
        reading,
        settings,
        licenseGated,
        caches,
        allTicketDocs,
        email,
        sms,
        bumpRefresh,
    });

    const ticketDate = formatStamp(ticket.captures[0]?.At);

    return (
        <div className={styles.screen}>
            <OpenTicketStrip tickets={openTickets} onResume={handleResume} />
            <WeighingBody
                left={{ ticket, ticketDate, recallOffers, caches, billing, amountDp: settings.Formats.AmountDp }}
                right={{
                    ticket,
                    reading,
                    loadLorry: indicator.loadLorry,
                    multiGross: settings.Rules.MultiGross,
                    armed,
                    gated: licenseGated,
                    onSave: () => void handleSave(),
                    onOpenPrintModal: () => setPrintModalOpen(true),
                }}
            />
            <PrintPreviewModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                data={slipData}
                onSend={() => void handlePrint()}
                sending={ticket.saving}
            />
        </div>
    );
};
