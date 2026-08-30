import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { DocRow } from "@db/types";
import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { getAllFields, getCalculatedFieldIds, useSchema } from "@engines/schemaEngine";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { buildTicketFormulaContext } from "./_private/buildTicketFormulaContext";
import { focusFirstTicketField } from "./_private/focusFirstTicketField";
import { PrintPreviewModal } from "./_private/PrintPreviewModal";
import { ReprintLookupModal } from "./_private/ReprintLookupModal";
import { hasBlockingCustomFieldError } from "./_private/schemaFieldValidation";
import { FIXED_FIELD_IDS, isCalculatedField } from "./_private/ticketFieldIds";
import { useComputedCalcFields } from "./_private/useComputedCalcFields";
import { useDeliveryChannels } from "./_private/useDeliveryChannels";
import { useWeighingScreenDerived } from "./_private/useWeighingScreenDerived";
import { useWeighingScreenTickets } from "./_private/useWeighingScreenTickets";
import { formatStamp } from "./_private/formatStamp";
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
        // `entry.contentRect.height` excludes the strip element's own
        // padding/border (content-box only) — undercounts its real rendered
        // height the same way AppShell.tsx's banner-height observer did
        // (task: "all setting page has double scroll bar"). Here that
        // shows up as a timing/flicker bug rather than a fixed offset: on
        // first paint `--weigh-strip-h` sits at its `48px` fallback, then
        // the observer's first callback snaps it to the undercounted real
        // value a frame later — if the strip has non-zero padding/border,
        // that's a second, *smaller* jump than the true height, so
        // `.actions-sticky`'s `top` briefly reserves less room than the
        // strip actually occupies and a stray scrollbar appears (and
        // sticks, since the wrong value is now steady-state). Reading
        // `stripEl.offsetHeight` instead gives the actual rendered box.
        const observer = new ResizeObserver(() => {
            screenEl.style.setProperty("--weigh-strip-h", `${stripEl.offsetHeight}px`);
        });
        observer.observe(stripEl);
        return () => observer.disconnect();
    }, [screenRef, stripRef, hasStrip]);
};

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
    /** `useReprintFlow`'s own flag — see WeighingRightColumnProps' comment. */
    forcePrintEnabled: boolean;
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
    forcePrintEnabled,
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
        showFormulaBreakdown: settings.Rules.ShowFormulaBreakdown,
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
        // Task: "enter on save should save then move to print" — Print only
        // actually enables once `handleSave` resolves and `ticket.docId`
        // lands (SaveAndPrintRow's own `printEnabled`), so the focus() has
        // to wait for the same promise rather than firing immediately;
        // Print stays unfocusable (and this is a no-op) if the save failed.
        // Same staleness gap as Capture→Save (ActionsCard.tsx): the promise
        // resolving only means the state update was dispatched, not that
        // React has re-rendered Print's `disabled` attribute yet — deferring
        // one frame past that gives the render time to land first (task:
        // "like how we did for save we also need to do for print").
        onSave: () =>
            void handleSave().then(() =>
                requestAnimationFrame(() => document.getElementById("actionsPrintBtn")?.focus()),
            ),
        onOpenPrintModal,
        onOpenReprintLookup,
        onNavigateToCameras,
        weightUnit: settings.Formats.WeightUnit,
        forcePrintEnabled,
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
        useWeighingScreenTickets(ticket, settings.Numbering.CurrentEpoch);

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

// Reprint populates the deck (`ticket.resume`) and locks every field exactly
// like a Save (`ticket.lock`) — it used to also print straight away, but
// task: "reprint should enable print and focus it" now leaves the actual
// send-to-printer step to the operator, same as any other Print, rather than
// firing silently the moment a ticket is found. `resume`'s own dispatch is
// async (a plain useReducer), so waiting for `ticket.docId` to catch up
// (rather than reading the still-previous-ticket `ticket` straight off this
// closure) is still needed before the Print button can be focused/enabled
// for the *found* ticket. `forcePrintEnabled` stays true — bypassing
// SaveAndPrintRow's normal `printCount === 0` gate for an already-printed
// ticket — until the operator actually uses Print or starts fresh, at
// which point the `captures.length === 0` effect below (both "New ticket"
// and the print-modal's onClose empty captures via `ticket.startNew()`)
// turns the override back off.
const useReprintFlow = (ticket: UseWeighingTicket) => {
    const [pendingDocId, setPendingDocId] = useState<string | null>(null);
    const [forcePrintEnabled, setForcePrintEnabled] = useState(false);
    useEffect(() => {
        if (pendingDocId === null || ticket.docId !== pendingDocId) return;
        setPendingDocId(null);
        setForcePrintEnabled(true);
        requestAnimationFrame(() => document.getElementById("actionsPrintBtn")?.focus());
    }, [pendingDocId, ticket.docId]);
    // Both "New ticket" and the print-modal's own onClose reset (task: "on
    // close of print dialog box the ticket need to reset to new ticket")
    // call `ticket.startNew()`, which always empties `captures` — a plain,
    // reliable "this override no longer applies" signal without either of
    // those two call sites needing a reference back into this hook's own
    // state.
    useEffect(() => {
        if (ticket.captures.length === 0) setForcePrintEnabled(false);
    }, [ticket.captures.length]);
    const reprint = (doc: DocRow): void => {
        ticket.resume(doc);
        ticket.lock();
        setPendingDocId(doc.DocId);
    };
    return { reprint, forcePrintEnabled };
};

export const WeighingScreen = ({ ticket, licenseGated, onNavigateToCameras }: WeighingScreenProps) => {
    const { printModalOpen, setPrintModalOpen, reprintLookupOpen, setReprintLookupOpen } = usePrintModals();
    const screenRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    const state = useWeighingScreenState(ticket, licenseGated);
    const { reprint, forcePrintEnabled } = useReprintFlow(ticket);
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
        forcePrintEnabled,
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
                onClose={() => {
                    setPrintModalOpen(false);
                    // Task: "on close of print dialog box the ticket need to
                    // reset to new ticket, focusing on the first field in the
                    // list same for new ticket" — same reset ActionsCard's
                    // own "New ticket" button triggers. This used to skip the
                    // reset for a reprint (`forcePrintEnabled`) and just
                    // refocus Print instead, per an earlier task ("after
                    // reprint dialog close we need to highlight the print
                    // button") — but a later report ("reprint to first field
                    // ... is still not fixed") wants reprint to behave exactly
                    // like every other Print-modal close: reset to a fresh
                    // ticket and focus the first field, not leave the
                    // just-reprinted ticket sitting loaded.
                    ticket.startNew();
                    focusFirstTicketField();
                }}
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
