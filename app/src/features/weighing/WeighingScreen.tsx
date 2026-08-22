import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { formatDateTimeInFmt } from "@constants/numberFormat";
import type { DocRow } from "@db/types";
import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { getAllFields, getCalculatedFieldIds, useSchema } from "@engines/schemaEngine";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { buildTicketFormulaContext } from "./_private/buildTicketFormulaContext";
import { PrintPreviewModal } from "./_private/PrintPreviewModal";
import { ReprintLookupModal } from "./_private/ReprintLookupModal";
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

// Exposes the open-ticket strip's own rendered height as `--weigh-strip-h`
// on `.screen` — ActionsCard's sticky wrapper (WeighingRightColumn.tsx's
// `.actions-sticky`) offsets its own sticky `top` by this, on top of the
// shell's own `--shell-header-h`, so it stacks under both instead of
// overlapping it at the same `top` slot (task: "change the position please
// and pin them there" — back at the top, pinned, this time without the
// overlap). Same ResizeObserver shape as AppShell.tsx's own
// `useStickyHeaderHeight` / ReportsCardBody.tsx's `useStickyFiltersHeight`.
// The CSS variable's own fallback (`, 48px`, WeighingScreen.module.css)
// covers the first paint before this effect's observer has measured
// anything real — the actual bug last time wasn't the composed-offset
// approach itself, it was `.actions-sticky` falling back to `0px` for that
// first frame and briefly sitting under the strip instead of below it.
// `hasStrip` (OpenTicketStrip returns null on an empty, already-loaded deck —
// see its own early-return) is a real effect dep, not just the stable
// `screenRef`/`stripRef` objects: without it, this effect only ever runs
// once at mount, so a strip that's absent at that moment (or unmounts and
// later remounts as a new DOM element once the deck goes empty-then-full
// again) is never (re-)observed and `--weigh-strip-h` goes stale — same
// fix AppShell.tsx's own `useStickyHeaderHeight` already applies via its
// `hasHeader` dep.
const useStickyStripHeight = (
    screenRef: RefObject<HTMLDivElement | null>,
    stripRef: RefObject<HTMLDivElement | null>,
    hasStrip: boolean,
): void => {
    useEffect(() => {
        const screenEl = screenRef.current;
        const stripEl = stripRef.current;
        if (!screenEl) return;
        if (!stripEl) {
            // Strip genuinely absent right now — don't leave a stale
            // fallback height reserving phantom space above ActionsCard.
            screenEl.style.setProperty("--weigh-strip-h", "0px");
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            if (!entry) return;
            screenEl.style.setProperty("--weigh-strip-h", `${entry.contentRect.height}px`);
        });
        observer.observe(stripEl);
        return () => observer.disconnect();
    }, [screenRef, stripRef, hasStrip]);
};

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
    const calculatedIds = getCalculatedFieldIds(ticketSchema);
    const customFieldDefs = getAllFields(ticketSchema).filter(
        (field) => !FIXED_FIELD_IDS.includes(field.FieldId) && !isCalculatedField(field, calculatedIds),
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
    calcValues: ReturnType<typeof useComputedCalcFields>;
    indicator: ReturnType<typeof useIndicator>;
    reading: ReturnType<typeof useIndicatorReading>;
    armed: ReturnType<typeof useWeighingScreenDerived>["armed"];
    licenseGated: boolean;
    hasBlockingCustomFieldError: boolean;
    handleSave: () => Promise<void>;
    onOpenPrintModal: () => void;
    onOpenReprintLookup: () => void;
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
    calcValues,
    indicator,
    reading,
    armed,
    licenseGated,
    hasBlockingCustomFieldError,
    handleSave,
    onOpenPrintModal,
    onOpenReprintLookup,
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
        calcValues,
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
        onOpenReprintLookup,
        onNavigateToCameras,
        weightUnit: settings.Formats.WeightUnit,
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

    // Task: "as soon as you click Save, whatever is the date and time, it
    // will go to TicketDate" — read from the stamp `useWeighingTicket.ts`'s
    // `saveTicket` writes on every save, not the first capture's timestamp
    // (a ticket saved well after its first capture used to show the wrong
    // time here).
    const ticketDate = formatStamp(
        typeof ticket.customFields.TicketDate === "string" ? ticket.customFields.TicketDate : undefined,
        lang,
        settings.Formats.DateFmt,
        settings.Formats.TimeFmt,
    );
    const hasBlockingCustomFieldErrorValue = computeHasBlockingCustomFieldError(ticket, ticketSchema);
    const calcValues = useComputedCalcFields(ticket, ticketSchema);

    return {
        indicator,
        reading,
        settings,
        ticketSchema,
        caches,
        allTicketDocs,
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
        calcValues,
    };
};

// End to end: an ordered capture array, a stability-gated deck, one status
// derived from the weights, the open-ticket strip so many lorries can be in
// flight at once, a simplified recall banner, and the mock's own `camCard`
// sidebar (a decorative preview tied to this same ticket state —
// @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
// Just the two modal open flags + their setters — split out purely to keep
// WeighingScreen itself under the file's own 60-line function budget.
const usePrintModals = () => {
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [reprintLookupOpen, setReprintLookupOpen] = useState(false);
    return { printModalOpen, setPrintModalOpen, reprintLookupOpen, setReprintLookupOpen };
};

// Reprint no longer opens PrintPreviewModal at all — it populates the deck
// (`ticket.resume`), locks every field exactly like a Save (`ticket.lock`),
// and prints straight away via the same `handlePrint` PrintPreviewModal's
// own "Send to printer" already calls (task: "reprint ... skip print
// preview, print directly"). `resume`'s own dispatch is async (a plain
// useReducer), so `handlePrint` — which reads `ticket` fresh off this same
// render's closure — can't fire in the same handler as `resume`: it would
// still see the *previous* ticket's fields/DocId. This tracks which DocId
// is still waiting on its resume to land, and the effect below fires the
// actual print only once `ticket.docId` catches up to it.
const useReprintFlow = (ticket: UseWeighingTicket, handlePrint: () => Promise<void>) => {
    const [pendingDocId, setPendingDocId] = useState<string | null>(null);
    useEffect(() => {
        if (pendingDocId === null || ticket.docId !== pendingDocId) return;
        setPendingDocId(null);
        void handlePrint();
    }, [pendingDocId, ticket.docId, handlePrint]);
    const reprint = (doc: DocRow): void => {
        ticket.resume(doc);
        ticket.lock();
        setPendingDocId(doc.DocId);
    };
    return reprint;
};

export const WeighingScreen = ({ ticket, licenseGated, onNavigateToCameras }: WeighingScreenProps) => {
    const { printModalOpen, setPrintModalOpen, reprintLookupOpen, setReprintLookupOpen } = usePrintModals();
    const screenRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    const state = useWeighingScreenState(ticket, licenseGated);
    const reprint = useReprintFlow(ticket, state.handlePrint);
    // Mirrors OpenTicketStrip's own early-return condition (tickets.length === 0 && !loading).
    useStickyStripHeight(screenRef, stripRef, state.openTickets.length > 0 || state.ticketsLoading);

    const { left, right } = buildWeighingBodyProps({
        ...state,
        ticket,
        licenseGated,
        hasBlockingCustomFieldError: state.hasBlockingCustomFieldErrorValue,
        onOpenPrintModal: () => setPrintModalOpen(true),
        onOpenReprintLookup: () => setReprintLookupOpen(true),
        onNavigateToCameras,
    });

    return (
        <div className={styles.screen} ref={screenRef}>
            <OpenTicketStrip
                tickets={state.openTickets}
                loading={state.ticketsLoading}
                onResume={state.handleResume}
                weightUnit={state.settings.Formats.WeightUnit}
                containerRef={stripRef}
            />
            <WeighingBody left={left} right={right} />
            <PrintPreviewModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                data={state.slipData}
                onSend={() => void state.handlePrint()}
                sending={ticket.saving}
            />
            <ReprintLookupModal
                open={reprintLookupOpen}
                onClose={() => setReprintLookupOpen(false)}
                allTicketDocs={state.allTicketDocs}
                onFound={reprint}
            />
        </div>
    );
};
