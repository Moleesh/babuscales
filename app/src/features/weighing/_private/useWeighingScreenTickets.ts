import { useMemo } from "react";

import { useToast } from "@components/Toast";
import type { DocRow } from "@db/types";
import { useMasterCache } from "@db/useMasterCache";
import type { UseMasterCache } from "@db/useMasterCache";
import { useSchema } from "@engines/schemaEngine";
import { useTranslation } from "@i18n/useTranslation";

import { listOpenTickets } from "../recall";
import type { OpenTicketSummary } from "../recall";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { upsertTypedMasters } from "./upsertTypedMasters";
import { useTicketDocs } from "./useTicketDocs";

// The five master caches this screen reads, bundled into one value —
// everything downstream (WeighingLeftColumn, useWeighingScreenDerived's
// recall/delivery lookups) takes `caches` instead of five separate props.
export interface WeighingCaches {
    vehicle: UseMasterCache;
    party: UseMasterCache;
    material: UseMasterCache;
    transporter: UseMasterCache;
    storedTare: UseMasterCache;
}

export interface UseWeighingScreenTickets {
    caches: WeighingCaches;
    allTicketDocs: DocRow[];
    /** True until the first ticket-docs load resolves — see `useTicketDocs`'s own `loading` doc comment. */
    ticketsLoading: boolean;
    openTickets: OpenTicketSummary[];
    bumpRefresh: () => void;
    handleResume: (summary: OpenTicketSummary) => void;
    handleSave: () => Promise<void>;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the five master caches plus everything that reads off the whole-ticket
// list (open-ticket strip, resume, and the save→refresh loop), unchanged
// from the inline versions they replace.
export const useWeighingScreenTickets = (ticket: UseWeighingTicket): UseWeighingScreenTickets => {
    const { allTicketDocs, loading: ticketsLoading, bumpRefresh } = useTicketDocs();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const { ticketSchema } = useSchema();

    const caches: WeighingCaches = {
        vehicle: useMasterCache("Vehicle"),
        party: useMasterCache("Party"),
        material: useMasterCache("Material"),
        transporter: useMasterCache("Transporter"),
        storedTare: useMasterCache("StoredTare"),
    };

    const openTickets = useMemo(
        () => listOpenTickets(allTicketDocs).filter((t) => t.doc.DocId !== ticket.docId),
        [allTicketDocs, ticket.docId],
    );

    const handleResume = (summary: OpenTicketSummary): void => {
        ticket.resume(summary.doc);
    };

    const handleSave = async (): Promise<void> => {
        // Task: reconcile whatever the operator typed into Vehicle/Party/
        // Material/Transporter into the Masters table before the doc save
        // itself — no more inline "＋ Add" button in TicketFieldsCard.tsx,
        // this is where that used to happen instead.
        try {
            await upsertTypedMasters(caches, ticket.fields, ticketSchema.Masters);
            await ticket.save();
            bumpRefresh();
        } catch (err) {
            // ticket.save() had no failure feedback at all — a rejected
            // save (licence gate, disk full, corrupt body) used to clear
            // the spinner silently, so the operator believed the ticket
            // was saved when it wasn't.
            console.error("Ticket save failed", err);
            showToast(t("components.toast.saveFailed"));
        }
    };

    return { caches, allTicketDocs, ticketsLoading, openTickets, bumpRefresh, handleResume, handleSave };
};
