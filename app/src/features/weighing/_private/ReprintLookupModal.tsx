import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { Field } from "@components/Field";
import type { DocRow } from "@db/types";
import { useTranslation } from "@i18n/useTranslation";

import { focusFirstTicketField } from "./focusFirstTicketField";
import styles from "../_styles/WeighingScreen.module.css";
import { formatTicketNo, getTicketNumberPrefix } from "../ticketNumber";

// Matches the operator's typed input against a doc's own printed ticket
// number — case/whitespace-insensitive, and also accepts the bare sequence
// number (e.g. "42" for "TKT-0042") since that's what most people will
// actually type.
const matchesTicketNo = (doc: DocRow, query: string): boolean => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return false;
    if (formatTicketNo(doc.DocSeq).toLowerCase() === trimmed) return true;
    return doc.DocSeq !== null && String(doc.DocSeq) === trimmed;
};

export interface ReprintLookupModalProps {
    open: boolean;
    onClose: () => void;
    allTicketDocs: DocRow[];
    /** Loads the matched ticket into the deck, locks every field the same
     * way a Save does, and prints it straight away — no print-preview step
     * (WeighingScreen's own `useReprintFlow`). */
    onFound: (doc: DocRow) => void;
}

// Reprint's own first step (task: "reprint first bring a pop to enter the
// ticket no and then fetches it to for print") — a small prompt for a
// ticket number, separate from the always-current-ticket Print button
// (ActionsCard's SaveAndPrintRow). Reuses the same `ticket.resume(doc)` path
// Reports already uses to reopen a completed ticket into the shared deck
// (App.tsx's `openTicket`), so the found ticket goes through the exact same
// slip-building pipeline as any other print.
export const ReprintLookupModal = ({ open, onClose, allTicketDocs, onFound }: ReprintLookupModalProps) => {
    const { t } = useTranslation();
    // Pre-filled with the site's configured prefix (task: "auto populate the
    // prefix in the reprint pop") — the operator only has to type the
    // numeric part instead of the whole ticket number.
    const [ticketNo, setTicketNo] = useState(getTicketNumberPrefix);
    const [error, setError] = useState(false);

    const close = (): void => {
        setTicketNo(getTicketNumberPrefix());
        setError(false);
        onClose();
    };

    // Task: "from reprint find highlights print, cancel first field" — Find
    // (below) hands off to `onFound` → `useReprintFlow`'s `reprint`, which
    // schedules its own focus onto the Print button once the found ticket
    // lands. Cancel/X/backdrop has no such follow-up target, so it left
    // focus wherever the browser's default post-close fallback happened to
    // land it instead of somewhere useful — same "reset and focus the first
    // field" behavior every other way out of this screen already gives.
    const cancel = (): void => {
        close();
        focusFirstTicketField();
    };

    const find = (): void => {
        const match = allTicketDocs.find((doc) => !doc.IsCancelled && matchesTicketNo(doc, ticketNo));
        if (!match) {
            setError(true);
            return;
        }
        onFound(match);
        close();
    };

    return (
        <AppModal open={open} title={t("weigh.reprintLookup.title")} onClose={cancel} size="small">
            <div style={{ display: "grid", gap: 9 }}>
                {/* `data-enter-skip` — this field has its own Enter handling
                    (find(), below); without opting out, useEnterAsTab's
                    global document-level listener still runs right after and
                    walks focus to the next element in DOM order (Cancel),
                    stealing focus back off Find whenever the lookup doesn't
                    match (task: "enter should go to find not cancel"). */}
                <Field id="reprint-lookup-ticket-no" label={t("weigh.ticket")}>
                    <input
                        id="reprint-lookup-ticket-no"
                        type="text"
                        autoFocus
                        autoComplete="off"
                        data-enter-skip
                        placeholder={t("weigh.reprintLookup.placeholder")}
                        value={ticketNo}
                        onChange={(event) => {
                            setTicketNo(event.target.value);
                            setError(false);
                        }}
                        // Cursor lands after the pre-filled prefix, not at
                        // its start (`autoFocus` alone can leave the value
                        // selected), so typing the numeric part just works
                        // without first clearing a selection.
                        onFocus={(event) => {
                            const end = event.target.value.length;
                            event.target.setSelectionRange(end, end);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") find();
                        }}
                    />
                </Field>
                {error && <p className={styles.fieldError}>{t("weigh.reprintLookup.notFound")}</p>}
                <div style={{ display: "flex", gap: 9 }}>
                    <Button onClick={cancel}>{t("weigh.cancel")}</Button>
                    <Button variant="primary" onClick={find}>
                        {t("weigh.reprintLookup.find")}
                    </Button>
                </div>
            </div>
        </AppModal>
    );
};
