import type { Dispatch } from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { newId } from "@db/id";
import {
    defaultCaptureKind,
    deriveWeights,
    emptyTicketBody,
    hasCapture,
    parseTicketBody,
} from "@db/ticketBody";
import type { Capture, CaptureType, DerivedWeights, TicketBody } from "@db/ticketBody";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { fromString, withinDecimalsAllowed } from "@engines/formulaEngine/Decimal";
import { useIndicator } from "@engines/indicator";

export interface TicketFormFields {
    vehicleNo: string;
    party: string;
    material: string;
    transporter: string;
    challanNo: string;
    /** Plain editable ticket field, same as challanNo — no auto-calc behind it. Kept as a string like every other form field; parsed to `TicketBody.Charge` on save. */
    charge: string;
}

export type RecalledField = "party" | "material" | "transporter";

/** A schema-driven custom field's value — keyed by `FieldId`, same value shape as `TicketBody.CustomFields`. */
export type CustomFieldValue = string | number | boolean | null;

/** `setCustomField`'s value parameter — `undefined` means "remove this field entirely" (e.g. a Calculated field whose formula stopped evaluating), distinct from `null`/`""` which are still explicit stored values. */
export type CustomFieldInput = CustomFieldValue | undefined;

const emptyFields = (): TicketFormFields => ({
    vehicleNo: "",
    party: "",
    material: "",
    transporter: "",
    challanNo: "",
    charge: "",
});

export interface UseWeighingTicket {
    docId: string | null;
    docSeq: number | null;
    fields: TicketFormFields;
    setField: (key: keyof TicketFormFields, value: string) => void;
    recalledFields: Set<RecalledField>;
    applyRecalledFields: (values: Partial<Pick<TicketFormFields, RecalledField>>) => void;
    /** Values for whatever custom Fields the active Schema adds beyond the 5 fixed ones above — keyed by FieldId. */
    customFields: Record<string, CustomFieldValue>;
    setCustomField: (fieldId: string, value: CustomFieldInput) => void;
    captures: Capture[];
    weights: DerivedWeights;
    kind: CaptureType | null;
    setKind: (kind: CaptureType) => void;
    /** Both weights are in — the ticket carries its final numbers, whether or not it has been saved yet. */
    isComplete: boolean;
    /** A capture just landed and hasn't been saved yet — see the
     * reducer-level `TicketState.awaitingSave`'s own doc comment. Exposed
     * publicly so ActionsCard can gate Print/Reprint on it (tasks: "for
     * second weight as soon as the capture is done both save and print
     * popup only save should be enabled", "after capture disable the
     * reprint until we save is completed"). */
    awaitingSave: boolean;
    /** "inLedger" equivalent — fields lock and the deck is free for the next lorry. */
    isLocked: boolean;
    printCount: number;
    saving: boolean;
    /** See the reducer-level field of the same name for the full
     * reasoning. */
    justResumed: boolean;
    capture: (weightKg: number) => void;
    /** Settings → Weighing → Rules.ManualEntry (CalcCard's typed inputs) — same `pushCapture` pipeline as `capture`, just `Source: "Manual"` instead of `"Indicator"`. Takes an explicit `CaptureType` so both the Tare and Gross boxes can submit independently, regardless of the awaitingSave gate that blocks `capture`. */
    manualCapture: (weightKg: number, kind: CaptureType) => void;
    useStoredTare: (weightKg: number, capturedAtIso: string) => void;
    save: () => Promise<void>;
    startNew: () => void;
    /** Resets to a fresh ticket. App.tsx's nav-tab click handler calls this
     * directly on entry into Weighing from elsewhere. */
    resetToNew: () => void;
    resume: (doc: DocRow) => void;
    print: () => Promise<void>;
    /** Same "Lock" transition `save()` already applies unconditionally on every save — exposed directly so Reprint (ReprintLookupModal → WeighingScreen) can lock a resumed ticket's fields even when it only carries a single capture (`resume`'s own `isLocked` only locks a *complete*, 2-capture ticket, matching normal open-strip resume behaviour). */
    lock: () => void;
}

// --- State + reducer -------------------------------------------------------
//
// One useReducer instead of nine useState calls: every transition below
// used to be a short but separate setXxx sequence inlined into whatever
// callback triggered it, which is what pushed this hook's own body well
// over the line budget. Collapsing them into a pure, named reducer (a) cuts
// the hook body to mostly one-line `dispatch(...)` calls and (b) gives
// this a plain function to unit-test without touching React at all.
interface TicketState {
    docId: string | null;
    docSeq: number | null;
    fields: TicketFormFields;
    recalledFields: Set<RecalledField>;
    customFields: Record<string, CustomFieldValue>;
    captures: Capture[];
    kind: CaptureType | null;
    /** A capture just landed and hasn't been saved yet — blocks starting the
     * next one. Forces exactly one Save (or Save & Park) between any two
     * captures, even a Tare immediately followed by a Gross in the same
     * sitting. Cleared by "Saved" (a save actually went through) and implied
     * false by "ResetToNew"/"Resumed" (both rebuild state from scratch). */
    awaitingSave: boolean;
    isLocked: boolean;
    printCount: number;
    saving: boolean;
    /** True right after resuming a single-weight (not yet complete) parked
     * ticket, so
     * Save/Print don't read as immediately actionable before the operator
     * has actually captured anything *this* sitting. Cleared the moment a
     * new capture lands (`AddCapture`) — from then on the normal
     * awaitingSave/isComplete rules already cover it. Never set on a
     * fresh/complete resume (nothing to wait on). */
    justResumed: boolean;
}

const fieldsFromBody = (body: TicketBody): TicketFormFields => ({
    vehicleNo: body.VehicleNo ?? "",
    party: body.Party ?? "",
    material: body.Material ?? "",
    transporter: body.Transporter ?? "",
    challanNo: body.ChallanNo ?? "",
    charge: body.Charge ?? "",
});

// A decimal string, or `undefined` ("no charge entered") — same "silently
// treated as absent, not thrown/blocked" convention the old Number(...)
// path used for empty/garbled input. `decimalsAllowed` mirrors
// `Schema.DecimalsAllowed` (schemaEngine/types.ts): off (default) also
// treats a fractional charge as absent, same as a malformed one.
const chargeToStore = (raw: string, decimalsAllowed: boolean): string | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
        if (!withinDecimalsAllowed(fromString(trimmed), decimalsAllowed)) return undefined;
        return trimmed;
    } catch {
        return undefined;
    }
};

const buildTicketBody = (
    fields: TicketFormFields,
    captures: Capture[],
    printCount: number,
    customFields: Record<string, CustomFieldValue>,
    decimalsAllowed: boolean,
): TicketBody => ({
    ...emptyTicketBody(),
    VehicleNo: fields.vehicleNo.trim() || undefined,
    Party: fields.party.trim() || undefined,
    Material: fields.material.trim() || undefined,
    Transporter: fields.transporter.trim() || undefined,
    ChallanNo: fields.challanNo.trim() || undefined,
    Charge: chargeToStore(fields.charge, decimalsAllowed),
    Captures: captures,
    PrintCount: printCount,
    // Omit the key entirely when there are no custom fields, so a ticket
    // with none serializes byte-identical to before CustomFields existed.
    ...(Object.keys(customFields).length > 0 ? { CustomFields: customFields } : {}),
});

export const initialTicketState = (): TicketState => ({
    docId: null,
    docSeq: null,
    fields: emptyFields(),
    recalledFields: new Set(),
    customFields: {},
    captures: [],
    kind: defaultCaptureKind([]),
    awaitingSave: false,
    isLocked: false,
    printCount: 0,
    saving: false,
    justResumed: false,
});

type TicketAction =
    | { type: "SetField"; key: keyof TicketFormFields; value: string }
    | { type: "ApplyRecalled"; values: Partial<Pick<TicketFormFields, RecalledField>> }
    | { type: "SetCustomField"; fieldId: string; value: CustomFieldInput }
    | { type: "SetKind"; kind: CaptureType | null }
    | { type: "AddCapture"; capture: Capture }
    | { type: "ResetToNew" }
    | { type: "SetSaving"; saving: boolean }
    | { type: "Saved"; docId: string; docSeq: number | null; ticketDateIso: string }
    | { type: "Lock" }
    | { type: "Resumed"; doc: DocRow }
    | { type: "Printed" };

// Pulled out of the "Resumed" case below purely to keep ticketReducer
// itself under the file's own 60-line function budget — same fields,
// same reasoning, just its own named function.
const resumedState = (doc: DocRow): TicketState => {
    const body = parseTicketBody(doc.Body);
    return {
        docId: doc.DocId,
        docSeq: doc.DocSeq,
        fields: fieldsFromBody(body),
        recalledFields: new Set(),
        customFields: body.CustomFields ?? {},
        // `captures` carries whichever single weight the parked ticket
        // already has straight into Captured & Calculated (CalcCard
        // reads off `ticket.captures`/`ticket.weights`, no separate
        // "resumed weight" plumbing needed) — resuming a Tare-only
        // ticket shows that Tare immediately, no re-weighing it.
        // `defaultCaptureKind` then reads that same array and returns
        // whichever of Tare/Gross is still missing, so the Tare/Gross
        // toggle (ActionsCard's SegmentedControl, bound to
        // `ticket.kind`) auto-flips to the correct side on its own —
        // resume a Tare-only ticket and it's already armed for Gross,
        // resume a Gross-only one (a loaded lorry weighed in first)
        // and it's already armed for Tare. No manual toggle needed
        // either way.
        captures: body.Captures,
        kind: defaultCaptureKind(body.Captures),
        awaitingSave: false,
        // Mirrors save()'s own rule: two captures in means the
        // ticket is already finalised — `save()` is the only path
        // that ever locks a ticket, so anything resumed at that
        // length was already locked when it was saved. Only PLAN
        // §7.5's open (one-weight) tickets should come back
        // editable — a completed ticket resumed from Reports must
        // stay locked, not reopen for editing.
        isLocked: body.Captures.length >= 2,
        printCount: body.PrintCount ?? 0,
        saving: false,
        // Only the single-weight, not-yet-complete case has anything to
        // wait on; a resumed complete/locked ticket (Reprint's own resume
        // path) has nothing left to capture, so Save/Print keep their
        // normal (already-locked) behaviour instead.
        justResumed: body.Captures.length === 1,
    };
};

// Exported (alongside `initialTicketState` below) purely so the unit test
// can drive it directly — the doc comment above this reducer already
// promises "a plain function to unit-test without touching React at all",
// which needs both of these visible outside the module to actually happen.
export const ticketReducer = (state: TicketState, action: TicketAction): TicketState => {
    switch (action.type) {
        case "SetField":
            return { ...state, fields: { ...state.fields, [action.key]: action.value } };
        case "ApplyRecalled": {
            const recalledFields = new Set(state.recalledFields);
            for (const key of Object.keys(action.values) as RecalledField[]) recalledFields.add(key);
            return { ...state, fields: { ...state.fields, ...action.values }, recalledFields };
        }
        case "SetCustomField": {
            if (action.value === undefined) {
                const customFields = { ...state.customFields };
                delete customFields[action.fieldId];
                return { ...state, customFields };
            }
            return {
                ...state,
                customFields: { ...state.customFields, [action.fieldId]: action.value },
            };
        }
        case "SetKind":
            return { ...state, kind: action.kind };
        case "AddCapture":
            // `kind: null` (not the effect's usual defaultCaptureKind
            // recompute) is what actually forces the save-between-captures
            // rule — see `awaitingSave`'s own doc comment.
            return {
                ...state,
                captures: [...state.captures, action.capture],
                kind: null,
                awaitingSave: true,
                // The operator just captured the second weight this
                // sitting — the wait `justResumed` was gating is over.
                justResumed: false,
            };
        case "ResetToNew":
            return initialTicketState();
        case "SetSaving":
            return { ...state, saving: action.saving };
        case "Saved":
            // `TicketDate` is stamped with the moment of the most recent
            // successful save, not the first capture's timestamp and not a
            // live clock. Every save (single-weight or completing)
            // restamps it.
            return {
                ...state,
                docId: action.docId,
                docSeq: action.docSeq,
                awaitingSave: false,
                customFields: { ...state.customFields, TicketDate: action.ticketDateIso },
            };
        case "Lock":
            // Also clears `justResumed` — a locked ticket (whether saved
            // normally or force-locked by Reprint for a 1-capture doc, see
            // `lock`'s own comment above) is no longer "waiting on a second
            // capture", so SaveAndPrintRow's `!justResumed` gate shouldn't
            // keep blocking Print for it. Without this, reprinting a
            // 1-capture (parked) ticket left `justResumed` stuck `true` from
            // `resumedState`, and Print/Save/Capture all stayed disabled
            // despite `forcePrintEnabled`'s override — a dead-end reprint.
            return { ...state, isLocked: true, justResumed: false };
        case "Resumed":
            return resumedState(action.doc);
        case "Printed":
            return { ...state, printCount: state.printCount + 1 };
        default: {
            const exhaustive: never = action;
            return exhaustive;
        }
    }
};

// --- Sub-hooks ---------------------------------------------------------
//
// Each groups one cohesive slice of the dispatch surface — field edits,
// capturing a weight, persistence (save/print) — behind a small returned
// object, so the top-level hook below reads as "wire these three groups
// together" instead of housing every callback itself.

const useTicketFieldActions = (dispatch: Dispatch<TicketAction>) => ({
    setField: useCallback(
        (key: keyof TicketFormFields, value: string) => dispatch({ type: "SetField", key, value }),
        [dispatch],
    ),
    applyRecalledFields: useCallback(
        (values: Partial<Pick<TicketFormFields, RecalledField>>) =>
            dispatch({ type: "ApplyRecalled", values }),
        [dispatch],
    ),
    setCustomField: useCallback(
        (fieldId: string, value: CustomFieldInput) => dispatch({ type: "SetCustomField", fieldId, value }),
        [dispatch],
    ),
    setKind: useCallback(
        (next: CaptureType) => dispatch({ type: "SetKind", kind: next }),
        [dispatch],
    ),
});

interface TicketCaptureDeps {
    state: Pick<TicketState, "kind" | "isLocked" | "captures">;
    dispatch: Dispatch<TicketAction>;
    indicator: ReturnType<typeof useIndicator>;
    operatorName: string;
    /** `Schema.DecimalsAllowed ?? false` — off (default) rejects a fractional weight the same way a duplicate/locked capture is already silently rejected below, instead of rounding it away. */
    decimalsAllowed: boolean;
}

const useTicketCaptureActions = ({
    state,
    dispatch,
    indicator,
    operatorName,
    decimalsAllowed,
}: TicketCaptureDeps) => {
    const { kind, isLocked, captures } = state;

    // Same reasoning as save()/print()'s savingRef/printingRef below: `captures`/
    // `isLocked` here are only as fresh as the last render, so two capture
    // events fired in quick succession (e.g. a flaky indicator or a
    // double-tapped manual-entry button) can both read the same stale
    // `captures` and both pass the `hasCapture` guard before either
    // dispatch's result has re-rendered — landing two captures of the same
    // kind on one ticket. Reset once `captures` actually changes (below),
    // not right after dispatch, so the window stays closed until the state
    // update this dispatch caused has actually landed.
    const captureLockRef = useRef(false);
    useEffect(() => {
        captureLockRef.current = false;
    }, [captures]);

    const pushCapture = useCallback(
        (weightKg: number, source: Capture["Source"], captureKind: CaptureType | null, capturedAtIso?: string) => {
            if (!captureKind || isLocked || captureLockRef.current) return;
            // Exactly one Tare and one Gross per ticket — once a kind has
            // been captured, it cannot be recaptured until Save.
            const blocked = hasCapture(captures, captureKind);
            if (blocked) return;
            // `decimalsAllowed` off (default): a fractional reading (a
            // manual typed entry, or an indicator reading that somehow slid
            // past serialIndicator.ts's own gate) is rejected outright here
            // rather than silently rounded — same "reject, don't coerce"
            // policy this migration applies to Charge/Money. On: still
            // capped at 2 fractional digits (Decimal.MAX_DECIMALS_ALLOWED_SCALE)
            // — `weightKg` is a plain JS number here (weight arithmetic isn't
            // Decimal-backed, see deriveWeights), so the cap is checked via
            // `* 100` rather than `Decimal.withinDecimalsAllowed`, which needs
            // an actual `Decimal`. Snapped to the nearest allowed grid (whole
            // kg, or hundredths of a kg) with a small epsilon first — ordinary
            // floating-point noise (e.g. an indicator/unit-conversion reading
            // landing on 1200.0000000001 instead of a clean 1200) must still
            // be accepted, same as the old unconditional `Math.round` did;
            // only a reading that's actually off the grid gets rejected.
            const grid = decimalsAllowed ? 100 : 1;
            const snapped = Math.round(weightKg * grid) / grid;
            if (Math.abs(weightKg - snapped) > 1e-6) return;
            captureLockRef.current = true;
            const capture: Capture = {
                CaptureId: newId(),
                Type: captureKind,
                WeightKg: snapped,
                At: capturedAtIso ?? new Date().toISOString(),
                Operator: operatorName,
                Source: source,
                Images: [],
            };
            dispatch({ type: "AddCapture", capture });
            if (source === "Indicator") indicator.reset?.();
        },
        [captures, indicator, isLocked, operatorName, decimalsAllowed, dispatch],
    );

    return {
        capture: useCallback((weightKg: number) => pushCapture(weightKg, "Indicator", kind), [pushCapture, kind]),
        // Manual entry takes an explicit kind rather than the ambient `kind`
        // state — the forced-save-between-captures gate nulls `kind` right
        // after any capture, but Settings → Weighing → Rules.ManualEntry lets
        // the operator fill in both Tare and Gross boxes independently, so
        // each box has to say which one it is instead of relying on that gate.
        manualCapture: useCallback(
            (weightKg: number, captureKind: CaptureType) => pushCapture(weightKg, "Manual", captureKind),
            [pushCapture],
        ),
        // Always "Tare" — a stored tare is by definition a tare weight, and
        // must be recorded as one regardless of which side (Tare/Gross) the
        // operator currently has the toggle set to. Using the ambient `kind`
        // here used to save the recalled weight as a Gross capture whenever
        // Gross was the active toggle, corrupting the ticket.
        useStoredTare: useCallback(
            (weightKg: number, capturedAtIso: string) =>
                pushCapture(weightKg, "StoredTare", "Tare", capturedAtIso),
            [pushCapture],
        ),
    };
};

interface TicketPersistenceDeps {
    docId: string | null;
    captures: Capture[];
    fields: TicketFormFields;
    customFields: Record<string, CustomFieldValue>;
    printCount: number;
    isLocked: boolean;
    /** Settings' `Rules.SameTicketNo` (default true — today's only behaviour). Off, and this ticket already carries a number from an earlier single-weight save, means the completing weight is saved as a brand-new doc/number of its own rather than reusing that one — see the `save` comment below. */
    sameTicketNo: boolean;
    /** `Schema.DecimalsAllowed ?? false` — threaded into `buildTicketBody`'s Charge parsing (see `chargeToStore`). */
    decimalsAllowed: boolean;
    db: ReturnType<typeof useDataPort>;
    dispatch: Dispatch<TicketAction>;
    indicator: ReturnType<typeof useIndicator>;
}

// The actual persistence work behind `save` below — pulled out of
// useTicketPersistenceActions purely to stay under the file's own line
// budget; behaviour (including every bug-fix comment it carries) is
// unchanged, just no longer inlined in the `useCallback` body.
const saveTicket = async ({
    docId,
    captures,
    fields,
    customFields,
    printCount,
    sameTicketNo,
    decimalsAllowed,
    db,
    dispatch,
    indicator,
}: TicketPersistenceDeps): Promise<void> => {
    // `docId` only exists here already if an earlier save persisted this
    // same ticket with fewer captures in it (a parked/resumed single-weight
    // ticket). With SameTicketNo off, the weight that completes the pair is
    // NOT folded into that earlier doc — it's saved as a fresh doc (DocId
    // undefined) with its own new number, and the original single-weight
    // doc is left exactly as it already was in the DB: a standalone,
    // permanent record under its own number. Both weights being captured
    // before the very first save (docId still null) has nothing to split
    // from, so it always behaves like SameTicketNo on regardless of the
    // setting.
    const splitIntoNewDoc = !sameTicketNo && docId !== null && captures.length >= 2;
    // Computed once here so the exact same instant both persists (in the
    // saved Body) and lands in the on-screen reducer state (the "Saved"
    // dispatch below).
    const ticketDateIso = new Date().toISOString();
    // One atomic call (was `saveDoc` then a conditional `allocateDocSeq`
    // as two separate IPC round trips) — a crash between the two used
    // to be able to leave a doc with both captures in but no number,
    // with nothing left to retry the allocation. See
    // `save_doc_and_allocate_seq`'s own doc comment in docs.rs.
    const resolvedDocId = splitIntoNewDoc ? undefined : (docId ?? undefined);
    const row = await db.saveDocAndAllocateSeq({
        ...(resolvedDocId !== undefined ? { DocId: resolvedDocId } : {}),
        DocKind: "Ticket",
        Body: buildTicketBody(
            fields,
            captures,
            printCount,
            { ...customFields, TicketDate: ticketDateIso },
            decimalsAllowed,
        ),
    });
    dispatch({ type: "Saved", docId: row.DocId, docSeq: row.DocSeq, ticketDateIso });
    // Every save locks the screen, not just the one that lands the second
    // capture. A single-weight save (e.g. Tare only) leaves the ticket
    // printable but no longer editable or re-capturable from this same
    // sitting; the operator reopens it via the open-ticket strip's
    // "resume" later for the return weighing ("Resumed" unlocks it again
    // exactly when `Captures.length < 2`, see that reducer branch). The
    // indicator reset below applies unconditionally too — "New ticket" can
    // reach this branch (see startNew's save() call) while a "Send to
    // lorry" animation for the last capture is still mid-flight, and that
    // ticker needs to be told to stop.
    dispatch({ type: "Lock" });
    indicator.reset?.();
    // A single-weight save used to always resetToNew() here — parking the
    // doc in the DB but wiping it off screen immediately, so there was no
    // way to print the receipt for that first weight. Now it just stays on
    // screen — still saved, now locked, still printable — and only
    // actually resets on an explicit "New ticket" click (startNew below).
};

interface PrintTicketDeps {
    docId: string;
    captures: Capture[];
    fields: TicketFormFields;
    customFields: Record<string, CustomFieldValue>;
    printCount: number;
    decimalsAllowed: boolean;
    db: ReturnType<typeof useDataPort>;
    dispatch: Dispatch<TicketAction>;
}

// The actual persistence work behind `print` below — pulled out of
// useTicketPersistenceActions purely to stay under the file's own line
// budget; behaviour (including the bug-fix comment it carries) is
// unchanged, just no longer inlined in the `useCallback` body.
const printTicket = async ({
    docId,
    captures,
    fields,
    customFields,
    printCount,
    decimalsAllowed,
    db,
    dispatch,
}: PrintTicketDeps): Promise<void> => {
    const nextCount = printCount + 1;
    // Dispatched only after the save actually succeeds — this used
    // to run before the `await`, so a failed `db.saveDoc` (licence
    // gate, disk full, corrupt body) still left the in-memory
    // `printCount` bumped. Since the Print button's own `disabled`
    // is `!docId || printCount > 0`, that permanently disabled
    // re-printing for a ticket the DB never actually recorded as
    // printed.
    await db.saveDoc({
        DocId: docId,
        DocKind: "Ticket",
        Body: {
            ...buildTicketBody(fields, captures, printCount, customFields, decimalsAllowed),
            PrintCount: nextCount,
        },
    });
    dispatch({ type: "Printed" });
};

const useTicketPersistenceActions = ({
    docId,
    captures,
    fields,
    customFields,
    printCount,
    isLocked,
    sameTicketNo,
    decimalsAllowed,
    db,
    dispatch,
    indicator,
}: TicketPersistenceDeps) => {
    // `saving` (dispatched below) isn't visible until React re-renders, so
    // a double-click/double-tap on the Save button — easy on a touchscreen
    // weighbridge terminal — can pass the `isLocked`/`captures.length`
    // guard twice before the disabled state ever paints. With `docId` still
    // null on both calls, that creates two separate ticket docs (two
    // numbers) for the one lorry. This ref is checked and set synchronously,
    // before any `await`, to actually close that window.
    const savingRef = useRef(false);
    // Same reasoning as savingRef above, for print() — a double-tap on the
    // Print button before React repaints the `saving`-derived disabled state
    // could otherwise double-increment PrintCount and double-write the doc.
    const printingRef = useRef(false);

    const save = useCallback(async () => {
        if (isLocked || captures.length === 0 || savingRef.current) return;
        savingRef.current = true;
        dispatch({ type: "SetSaving", saving: true });
        try {
            await saveTicket({
                docId,
                captures,
                fields,
                customFields,
                printCount,
                isLocked,
                sameTicketNo,
                decimalsAllowed,
                db,
                dispatch,
                indicator,
            });
        } finally {
            savingRef.current = false;
            dispatch({ type: "SetSaving", saving: false });
        }
    }, [
        captures,
        customFields,
        db,
        docId,
        fields,
        indicator,
        isLocked,
        printCount,
        sameTicketNo,
        decimalsAllowed,
        dispatch,
    ]);

    // A single-weight save leaves the ticket unlocked (still editable for
    // the second capture) but already persisted — `docId` alone is the
    // right gate here, same as the Print button's own disabled condition in
    // ActionsCard, so an operator can print/reprint that first weight's
    // receipt without waiting for the ticket to be complete.
    const print = useCallback(async () => {
        if (!docId || printingRef.current) return;
        printingRef.current = true;
        dispatch({ type: "SetSaving", saving: true });
        try {
            await printTicket({ docId, captures, fields, customFields, printCount, decimalsAllowed, db, dispatch });
        } finally {
            printingRef.current = false;
            dispatch({ type: "SetSaving", saving: false });
        }
    }, [captures, customFields, db, docId, fields, printCount, decimalsAllowed, dispatch]);

    return { save, print };
};

interface TicketLifecycleDeps {
    captures: Capture[];
    docId: string | null;
    resetToNew: () => void;
    save: () => Promise<void>;
    dispatch: Dispatch<TicketAction>;
    indicator: ReturnType<typeof useIndicator>;
}

// startNew/clear/resume: the three ways a ticket's identity changes out from
// under the form — parking the current one and moving on, discarding it, or
// swapping in a different saved one entirely.
const useTicketLifecycleActions = ({
    captures,
    docId,
    resetToNew,
    save,
    dispatch,
    indicator,
}: TicketLifecycleDeps) => {
    // PLAN mock parity: the first "New ticket" click on genuinely unsaved
    // work (never hit Save even once) saves it rather than discarding it; a
    // second click then actually starts fresh — by then `docId` is set, so
    // it falls straight into the reset branch below.
    // `docId` rather than `isLocked` — a
    // single-weight save now stays on screen instead of resetting itself
    // (see save()'s own comment), so once it's already saved once, "New
    // ticket" should reset immediately rather than re-saving in a loop.
    const startNew = useCallback(() => {
        if (captures.length > 0 && docId === null) {
            void save();
        } else {
            resetToNew();
        }
    }, [captures.length, docId, resetToNew, save]);

    const resume = useCallback(
        (doc: DocRow) => {
            dispatch({ type: "Resumed", doc });
            indicator.reset?.();
        },
        [dispatch, indicator],
    );

    // Reprint's own lock — see UseWeighingTicket.lock's own doc comment.
    // Side effect: the "Lock" reducer case also clears `justResumed` (see
    // its own comment on that case) — intentional there for the Reprint
    // 1-capture case, but worth knowing about since `lock()` is called
    // directly, not just reached via save().
    const lock = useCallback(() => dispatch({ type: "Lock" }), [dispatch]);

    return { startNew, resume, lock };
};

// The reducer itself plus the one derived effect that keeps `kind` in sync
// with `captures`, and the `resetToNew` action every other sub-hook above
// needs a reference to — kept together since they all revolve around the
// same `dispatch`.
const useTicketState = (indicator: ReturnType<typeof useIndicator>) => {
    const [state, dispatch] = useReducer(ticketReducer, undefined, initialTicketState);

    useEffect(() => {
        // `awaitingSave` wins outright: a capture just landed and `kind` was
        // deliberately nulled by the reducer to force a Save before the next
        // one — this effect must not resurrect it (see `awaitingSave`'s own
        // doc comment on `TicketState`).
        if (state.awaitingSave) return;
        // Only steps in when the *current* kind has genuinely stopped being
        // a valid choice (already captured) or there's no kind at all yet.
        // Bug fix: this used to unconditionally recompute "the" default
        // from `captures` alone and overwrite `state.kind` whenever it
        // differed — which fired right after the operator's own manual
        // SegmentedControl pick (ActionsCard.tsx) dispatched a *different*
        // kind than the order-based default, silently snapping it back and
        // making the Tare/Gross toggle look broken.
        const kindStillValid = state.kind !== null && !hasCapture(state.captures, state.kind);
        if (kindStillValid) return;
        const next = defaultCaptureKind(state.captures);
        if (next !== state.kind) dispatch({ type: "SetKind", kind: next });
    }, [state.captures, state.kind, state.awaitingSave]);

    const resetToNew = useCallback(() => {
        dispatch({ type: "ResetToNew" });
        indicator.reset?.();
    }, [indicator]);

    return { state, dispatch, resetToNew };
};

interface AssembleTicketArgs {
    state: TicketState;
    fieldActions: ReturnType<typeof useTicketFieldActions>;
    captureActions: ReturnType<typeof useTicketCaptureActions>;
    persistenceActions: ReturnType<typeof useTicketPersistenceActions>;
    lifecycleActions: ReturnType<typeof useTicketLifecycleActions>;
    /** `useTicketState`'s own `resetToNew` — passed straight through rather
     * than routed via `lifecycleActions` (which only re-exposes `startNew`,
     * a save-aware wrapper around this), since App.tsx's Weighing nav-tab
     * handler needs the raw unconditional reset. */
    resetToNew: () => void;
}

// The public shape the hook returns, assembled from `state` plus the four
// action groups above — a pure mapping with no hooks of its own, so it can
// live outside useWeighingTicket's own body instead of being one long
// object literal inside it.
const assembleTicket = ({
    state,
    fieldActions,
    captureActions,
    persistenceActions,
    lifecycleActions,
    resetToNew,
}: AssembleTicketArgs): UseWeighingTicket => ({
    docId: state.docId,
    docSeq: state.docSeq,
    fields: state.fields,
    setField: fieldActions.setField,
    recalledFields: state.recalledFields,
    applyRecalledFields: fieldActions.applyRecalledFields,
    customFields: state.customFields,
    setCustomField: fieldActions.setCustomField,
    captures: state.captures,
    weights: deriveWeights(state.captures),
    kind: state.kind,
    setKind: fieldActions.setKind,
    isComplete: state.captures.length >= 2,
    awaitingSave: state.awaitingSave,
    isLocked: state.isLocked,
    printCount: state.printCount,
    saving: state.saving,
    justResumed: state.justResumed,
    capture: captureActions.capture,
    manualCapture: captureActions.manualCapture,
    useStoredTare: captureActions.useStoredTare,
    save: persistenceActions.save,
    startNew: lifecycleActions.startNew,
    resetToNew,
    resume: lifecycleActions.resume,
    print: persistenceActions.print,
    lock: lifecycleActions.lock,
});

// `operatorName` is the mock's own "Operator on duty" (Settings' Appearance
// pane, not admin-gated — a free-text label, not a login) stamped onto
// every capture; it can change mid-shift, so it's read fresh at capture
// time rather than closed over once. `sameTicketNo` (Settings → Weighing →
// Rules, default on) only affects `save` — see its own comment there.
// `decimalsAllowed` is the active `Schema.DecimalsAllowed ?? false`
// (schemaEngine/types.ts) — gates whether Charge/a Capture's WeightKg may
// carry a (<=2-digit) fraction; see `chargeToStore`/`pushCapture` above.
export const useWeighingTicket = (
    operatorName: string,
    sameTicketNo = true,
    decimalsAllowed = false,
): UseWeighingTicket => {
    const db = useDataPort();
    const indicator = useIndicator();

    const { state, dispatch, resetToNew } = useTicketState(indicator);
    const fieldActions = useTicketFieldActions(dispatch);
    const captureActions = useTicketCaptureActions({
        state: { kind: state.kind, isLocked: state.isLocked, captures: state.captures },
        dispatch,
        indicator,
        operatorName,
        decimalsAllowed,
    });
    const persistenceActions = useTicketPersistenceActions({
        docId: state.docId,
        captures: state.captures,
        fields: state.fields,
        customFields: state.customFields,
        printCount: state.printCount,
        isLocked: state.isLocked,
        sameTicketNo,
        decimalsAllowed,
        db,
        dispatch,
        indicator,
    });
    const lifecycleActions = useTicketLifecycleActions({
        captures: state.captures,
        docId: state.docId,
        resetToNew,
        save: persistenceActions.save,
        dispatch,
        indicator,
    });

    return assembleTicket({ state, fieldActions, captureActions, persistenceActions, lifecycleActions, resetToNew });
};
