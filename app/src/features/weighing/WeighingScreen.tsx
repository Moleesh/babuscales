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

interface BuildWeighingBodyPropsArgs {
    ticket: UseWeighingTicket;
    ticketDate: string;
    recallOffers: ReturnType<typeof useWeighingScreenDerived>["recallOffers"];
    caches: ReturnType<typeof useWeighingScreenTickets>["caches"];
    billing: ReturnType<typeof useWeighingScreenDerived>["billing"];
    ticketSchema: ReturnType<typeof useSchema>["ticketSchema"];
    settings: ReturnType<typeof useSettings>["settings"];
    calcSegments: ReturnType<typeof useComputedCalcFields>;
    indicator: ReturnType<typeof useIndicator>;
    reading: ReturnType<typeof useIndicatorReading>;
    armed: ReturnType<typeof useWeighingScreenDerived>["armed"];
    licenseGated: boolean;
    hasBlockingCustomFieldError: boolean;
    handleSave: () => Promise<void>;
    onOpenPrintModal: () => void;
    onNavigateToCameras: () => void;
}

// Assembles WeighingBody's `left`/`right` props from the screen's own hook
// results — pulled out of WeighingScreen purely to stay under the file's
// own line budget.
const buildWeighingBodyProps = ({
    ticket,
    ticketDate,
    recallOffers,
    caches,
    billing,
    ticketSchema,
    settings,
    calcSegments,
    indicator,
    reading,
    armed,
    licenseGated,
    hasBlockingCustomFieldError,
    handleSave,
    onOpenPrintModal,
    onNavigateToCameras,
}: BuildWeighingBodyPropsArgs) => ({
    left: {
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
    },
    right: {
        ticket,
        reading,
        // Both adapters implement `indicator.loadLorry` now
        // (serialIndicator.ts layers the same settle physics over
        // its own readings) — `ShowSendLorry` (Settings →
        // Weighing Rules) is the only gate left.
        loadLorry: settings.Rules.ShowSendLorry ? indicator.loadLorry : undefined,
        armed,
        gated: licenseGated,
        hasBlockingCustomFieldError,
        onSave: () => void handleSave(),
        onOpenPrintModal,
        onNavigateToCameras,
    },
});

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

// Bundles every hook WeighingScreen needs before it can assemble
// WeighingBody's props — pulled out purely to stay under the file's own
// line budget.
const useWeighingScreenState = (ticket: UseWeighingTicket, licenseGated: boolean) => {
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const { settings } = useSettings();
    const { lang, t } = useTranslation();
    const { email, sms } = useDeliveryChannels();
    const { ticketSchema } = useSchema();

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

    const ticketDate = formatStamp(ticket.captures[0]?.At, lang, settings.Formats.DateFmt, settings.Formats.TimeFmt);
    const hasBlockingCustomFieldErrorValue = computeHasBlockingCustomFieldError(ticket, ticketSchema);
    const calcSegments = useComputedCalcFields(ticket, ticketSchema);

    return {
        indicator,
        reading,
        settings,
        ticketSchema,
        caches,
        ticketsLoading,
        openTickets,
        handleResume,
        handleSave,
        armed,
        recallOffers,
        billing,
        handlePrint,
        slipData,
        ticketDate,
        hasBlockingCustomFieldErrorValue,
        calcSegments,
    };
};

// End to end: an ordered capture array, a stability-gated deck, one status
// derived from the weights, the open-ticket strip so many lorries can be in
// flight at once, a simplified recall banner, and the mock's own `camCard`
// sidebar (a decorative preview tied to this same ticket state —
// @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
export const WeighingScreen = ({ ticket, licenseGated, onNavigateToCameras }: WeighingScreenProps) => {
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const {
        indicator,
        reading,
        settings,
        ticketSchema,
        caches,
        ticketsLoading,
        openTickets,
        handleResume,
        handleSave,
        armed,
        recallOffers,
        billing,
        handlePrint,
        slipData,
        ticketDate,
        hasBlockingCustomFieldErrorValue,
        calcSegments,
    } = useWeighingScreenState(ticket, licenseGated);

    const { left, right } = buildWeighingBodyProps({
        ticket,
        ticketDate,
        recallOffers,
        caches,
        billing,
        ticketSchema,
        settings,
        calcSegments,
        indicator,
        reading,
        armed,
        licenseGated,
        hasBlockingCustomFieldError: hasBlockingCustomFieldErrorValue,
        handleSave,
        onOpenPrintModal: () => setPrintModalOpen(true),
        onNavigateToCameras,
    });

    return (
        <div className={styles.screen}>
            <OpenTicketStrip
                tickets={openTickets}
                loading={ticketsLoading}
                onResume={handleResume}
                weightUnit={settings.Formats.WeightUnit}
            />
            <WeighingBody left={left} right={right} />
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
