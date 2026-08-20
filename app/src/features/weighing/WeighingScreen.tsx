import { useState } from "react";

import { formatDateTimeInFmt } from "@constants/numberFormat";
import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { getAllFields, useSchema } from "@engines/schemaEngine";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { buildTicketFormulaContext } from "./_private/buildTicketFormulaContext";
import { PrintPreviewModal } from "./_private/PrintPreviewModal";
import { hasBlockingCustomFieldError } from "./_private/schemaFieldValidation";
import { FIXED_FIELD_IDS, isCalculatedField } from "./_private/ticketFieldIds";
import { useComputedCalcFields } from "./_private/useComputedCalcFields";
import { useDeliveryChannels } from "./_private/useDeliveryChannels";
import { useWeighingScreenDerived } from "./_private/useWeighingScreenDerived";
import { useWeighingScreenTickets } from "./_private/useWeighingScreenTickets";
import { WeighingBody } from "./_private/WeighingBody";
import styles from "./_styles/WeighingScreen.module.css";
import { OpenTicketStrip } from "./OpenTicketStrip";
import type { UseWeighingTicket } from "./useWeighingTicket";

const formatStamp = (
    iso: string | undefined,
    lang: string,
    dateFmt: string,
    timeFmt: "24" | "12",
): string => (iso ? formatDateTimeInFmt(iso, lang, dateFmt, timeFmt) : "—");

// Split out of WeighingScreen (over the 60-line function budget —
// docs/CodingStandards.md) — the same visible/Validate/Block check
// SchemaFieldRow runs per custom field, recomputed here so Save can be
// gated on it too (see ActionsCard's SaveAndPrintRow).
const computeHasBlockingCustomFieldError = (
    ticket: UseWeighingTicket,
    ticketSchema: ReturnType<typeof useSchema>["ticketSchema"],
): boolean => {
    const customFieldDefs = getAllFields(ticketSchema).filter(
        (field) => !FIXED_FIELD_IDS.includes(field.FieldId) && !isCalculatedField(field),
    );
    const formulaCtx = buildTicketFormulaContext(ticket, ticket.customFields);
    return hasBlockingCustomFieldError(customFieldDefs, formulaCtx);
};

export interface WeighingScreenProps {
    /** Lifted to Shell so Reports can resume a ticket into the same deck across a tab switch. */
    ticket: UseWeighingTicket;
    /**
     * `useLicense().isGated` — the one place licence state
     * actually changes what the operator can do: a lapsed trial or invalid
     * code blocks new captures and Save, but never touches an
     * already-open ticket's fields, Reports, Dashboard or Masters — those
     * stay fully readable (and Print still works for whatever was already
     * saved) so a lapsed licence never locks an operator out of data
     * they're entitled to see, only out of adding more of it.
     */
    licenseGated: boolean;
    /** Jumps out to the Cameras tab from the sidebar's "Go to Cameras" shortcut — App.tsx owns tab state, this screen doesn't. */
    onNavigateToCameras: () => void;
}

// End to end: an ordered capture array, a stability-gated deck, one status
// derived from the weights, the open-ticket strip so many lorries can be in
// flight at once, a simplified recall banner, and the mock's own `camCard`
// sidebar (a decorative preview tied to this same ticket state —
// @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
export const WeighingScreen = ({ ticket, licenseGated, onNavigateToCameras }: WeighingScreenProps) => {
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const { settings } = useSettings();
    const { lang, t } = useTranslation();
    const { email, sms } = useDeliveryChannels();
    const { ticketSchema } = useSchema();

    const [printModalOpen, setPrintModalOpen] = useState(false);

    const { caches, allTicketDocs, ticketsLoading, openTickets, bumpRefresh, handleResume, handleSave } =
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
        lang,
        t,
    });

    const ticketDate = formatStamp(
        ticket.captures[0]?.At,
        lang,
        settings.Formats.DateFmt,
        settings.Formats.TimeFmt,
    );
    const hasBlockingCustomFieldErrorValue = computeHasBlockingCustomFieldError(ticket, ticketSchema);
    const calcSegments = useComputedCalcFields(ticket, ticketSchema);

    return (
        <div className={styles.screen}>
            <OpenTicketStrip
                tickets={openTickets}
                loading={ticketsLoading}
                onResume={handleResume}
                weightUnit={settings.Formats.WeightUnit}
            />
            <WeighingBody
                left={{
                    ticket,
                    ticketDate,
                    recallOffers,
                    caches,
                    billing,
                    ticketSchema,
                    amountDp: settings.Formats.AmountDp,
                    manualEntry: settings.Rules.ManualEntry,
                    weightUnit: settings.Formats.WeightUnit,
                    dateFmt: settings.Formats.DateFmt,
                    timeFmt: settings.Formats.TimeFmt,
                    calcSegments,
                }}
                right={{
                    ticket,
                    reading,
                    // Both adapters implement `indicator.loadLorry` now
                    // (serialIndicator.ts layers the same settle physics over
                    // its own readings) — `ShowSendLorry` (Settings →
                    // Weighing Rules) is the only gate left.
                    loadLorry: settings.Rules.ShowSendLorry ? indicator.loadLorry : undefined,
                    armed,
                    gated: licenseGated,
                    hasBlockingCustomFieldError: hasBlockingCustomFieldErrorValue,
                    onSave: () => void handleSave(),
                    onOpenPrintModal: () => setPrintModalOpen(true),
                    onNavigateToCameras,
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
