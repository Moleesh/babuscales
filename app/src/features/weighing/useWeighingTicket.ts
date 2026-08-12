import type { Dispatch } from "react";
import { useCallback, useEffect, useReducer } from "react";

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
import { useIndicator } from "@engines/indicator";

export interface TicketFormFields {
    vehicleNo: string;
    party: string;
    material: string;
    transporter: string;
    challanNo: string;
}

export type RecalledField = "party" | "material" | "transporter";

/** A schema-driven custom field's value (PLAN §8) — keyed by `FieldId`, same value shape as `TicketBody.CustomFields`. */
export type CustomFieldValue = string | number | boolean | null;

const emptyFields = (): TicketFormFields => ({
    vehicleNo: "",
    party: "",
    material: "",
    transporter: "",
    challanNo: "",
});

export interface UseWeighingTicket {
    docId: string | null;
    docSeq: number | null;
    fields: TicketFormFields;
    setField: (key: keyof TicketFormFields, value: string) => void;
    recalledFields: Set<RecalledField>;
    applyRecalledFields: (values: Partial<Pick<TicketFormFields, RecalledField>>) => void;
    /** Values for whatever custom Fields the active Schema adds beyond the 5 fixed ones above — keyed by FieldId (PLAN §8). */
    customFields: Record<string, CustomFieldValue>;
    setCustomField: (fieldId: string, value: CustomFieldValue) => void;
    captures: Capture[];
    weights: DerivedWeights;
    kind: CaptureType | null;
    setKind: (kind: CaptureType) => void;
    /** Both weights are in — the ticket carries its final numbers, whether or not it has been saved yet. */
    isComplete: boolean;
    /** PLAN §7.5 "inLedger" equivalent — fields lock and the deck is free for the next lorry. */
    isLocked: boolean;
    printCount: number;
    saving: boolean;
    capture: (weightKg: number) => void;
    /** Settings → Weighing → Rules.ManualEntry (CalcCard's typed inputs) — same `pushCapture` pipeline as `capture`, just `Source: "Manual"` instead of `"Indicator"`. */
    manualCapture: (weightKg: number) => void;
    useStoredTare: (weightKg: number, capturedAtIso: string) => void;
    save: () => Promise<void>;
    startNew: () => void;
    resume: (doc: DocRow) => void;
    print: () => Promise<void>;
}

// --- State + reducer -------------------------------------------------------
//
// One useReducer instead of nine useState calls: every transition below
// used to be a short but separate setXxx sequence inlined into whatever
// callback triggered it, which is what pushed this hook's own body well
// over the line budget. Collapsing them into a pure, named reducer (a) cuts
// the hook body to mostly one-line `dispatch(...)` calls and (b) gives
// task #61 a plain function to unit-test without touching React at all.
interface TicketState {
    docId: string | null;
    docSeq: number | null;
    fields: TicketFormFields;
    recalledFields: Set<RecalledField>;
    customFields: Record<string, CustomFieldValue>;
    captures: Capture[];
    kind: CaptureType | null;
    isLocked: boolean;
    printCount: number;
    saving: boolean;
}

const fieldsFromBody = (body: TicketBody): TicketFormFields => ({
    vehicleNo: body.VehicleNo ?? "",
    party: body.Party ?? "",
    material: body.Material ?? "",
    transporter: body.Transporter ?? "",
    challanNo: body.ChallanNo ?? "",
});

const buildTicketBody = (
    fields: TicketFormFields,
    captures: Capture[],
    printCount: number,
    customFields: Record<string, CustomFieldValue>,
): TicketBody => ({
    ...emptyTicketBody(),
    VehicleNo: fields.vehicleNo.trim() || undefined,
    Party: fields.party.trim() || undefined,
    Material: fields.material.trim() || undefined,
    Transporter: fields.transporter.trim() || undefined,
    ChallanNo: fields.challanNo.trim() || undefined,
    Captures: captures,
    PrintCount: printCount,
    // Omit the key entirely when there are no custom fields, so a ticket
    // with none serializes byte-identical to before CustomFields existed.
    ...(Object.keys(customFields).length > 0 ? { CustomFields: customFields } : {}),
});

const initialTicketState = (tareFirst: boolean, multiGross: boolean): TicketState => ({
    docId: null,
    docSeq: null,
    fields: emptyFields(),
    recalledFields: new Set(),
    customFields: {},
    captures: [],
    kind: defaultCaptureKind([], tareFirst, multiGross),
    isLocked: false,
    printCount: 0,
    saving: false,
});

type TicketAction =
    | { type: "SetField"; key: keyof TicketFormFields; value: string }
    | { type: "ApplyRecalled"; values: Partial<Pick<TicketFormFields, RecalledField>> }
    | { type: "SetCustomField"; fieldId: string; value: CustomFieldValue }
    | { type: "SetKind"; kind: CaptureType | null }
    | { type: "AddCapture"; capture: Capture }
    | { type: "ResetToNew"; tareFirst: boolean; multiGross: boolean }
    | { type: "SetSaving"; saving: boolean }
    | { type: "Saved"; docId: string; docSeq: number | null }
    | { type: "Lock" }
    | { type: "Resumed"; doc: DocRow; tareFirst: boolean; multiGross: boolean }
    | { type: "Printed" };

const ticketReducer = (state: TicketState, action: TicketAction): TicketState => {
    switch (action.type) {
        case "SetField":
            return { ...state, fields: { ...state.fields, [action.key]: action.value } };
        case "ApplyRecalled": {
            const recalledFields = new Set(state.recalledFields);
            for (const key of Object.keys(action.values) as RecalledField[]) recalledFields.add(key);
            return { ...state, fields: { ...state.fields, ...action.values }, recalledFields };
        }
        case "SetCustomField":
            return {
                ...state,
                customFields: { ...state.customFields, [action.fieldId]: action.value },
            };
        case "SetKind":
            return { ...state, kind: action.kind };
        case "AddCapture":
            return { ...state, captures: [...state.captures, action.capture] };
        case "ResetToNew":
            return initialTicketState(action.tareFirst, action.multiGross);
        case "SetSaving":
            return { ...state, saving: action.saving };
        case "Saved":
            return { ...state, docId: action.docId, docSeq: action.docSeq };
        case "Lock":
            return { ...state, isLocked: true };
        case "Resumed": {
            const body = parseTicketBody(action.doc.Body);
            return {
                docId: action.doc.DocId,
                docSeq: action.doc.DocSeq,
                fields: fieldsFromBody(body),
                recalledFields: new Set(),
                customFields: body.CustomFields ?? {},
                captures: body.Captures,
                kind: defaultCaptureKind(body.Captures, action.tareFirst, action.multiGross),
                // Mirrors save()'s own rule: two-or-more captures in means the
                // ticket is already finalised — `save()` is the only path that
                // ever locks a ticket (task #46: still triggered at
                // captures.length>=2 regardless of how many Gross captures that
                // includes), so anything resumed at that length was already
                // locked when it was saved. Only PLAN §7.5's open (one-weight)
                // tickets should come back editable — a completed ticket resumed
                // from Reports must stay locked, not reopen for editing.
                isLocked: body.Captures.length >= 2,
                printCount: body.PrintCount ?? 0,
                saving: false,
            };
        }
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
        (fieldId: string, value: CustomFieldValue) => dispatch({ type: "SetCustomField", fieldId, value }),
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
    multiGross: boolean;
}

const useTicketCaptureActions = ({
    state,
    dispatch,
    indicator,
    operatorName,
    multiGross,
}: TicketCaptureDeps) => {
    const { kind, isLocked, captures } = state;

    const pushCapture = useCallback(
        (weightKg: number, source: Capture["Source"], capturedAtIso?: string) => {
            if (!kind || isLocked) return;
            // Task #46: a repeat "Gross" is the one case `hasCapture` must not
            // block once MultiGross is on — everything else (a second Tare)
            // still refuses exactly as before.
            const blocked = hasCapture(captures, kind) && !(multiGross && kind === "Gross");
            if (blocked) return;
            const capture: Capture = {
                CaptureId: newId(),
                Type: kind,
                WeightKg: Math.round(weightKg),
                At: capturedAtIso ?? new Date().toISOString(),
                Operator: operatorName,
                Source: source,
                Images: [],
            };
            dispatch({ type: "AddCapture", capture });
            if (source === "Indicator") indicator.reset?.();
        },
        [captures, indicator, isLocked, kind, multiGross, operatorName, dispatch],
    );

    return {
        capture: useCallback((weightKg: number) => pushCapture(weightKg, "Indicator"), [pushCapture]),
        manualCapture: useCallback((weightKg: number) => pushCapture(weightKg, "Manual"), [pushCapture]),
        useStoredTare: useCallback(
            (weightKg: number, capturedAtIso: string) =>
                pushCapture(weightKg, "StoredTare", capturedAtIso),
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
    db: ReturnType<typeof useDataPort>;
    dispatch: Dispatch<TicketAction>;
    resetToNew: () => void;
}

const useTicketPersistenceActions = ({
    docId,
    captures,
    fields,
    customFields,
    printCount,
    isLocked,
    db,
    dispatch,
    resetToNew,
}: TicketPersistenceDeps) => {
    const save = useCallback(async () => {
        if (isLocked || captures.length === 0) return;
        dispatch({ type: "SetSaving", saving: true });
        try {
            const row = await db.saveDoc({
                DocId: docId ?? undefined,
                DocKind: "Ticket",
                Body: buildTicketBody(fields, captures, printCount, customFields),
            });
            let seq = row.DocSeq;
            if (seq === null) {
                const numbered = await db.allocateDocSeq(row.DocId);
                seq = numbered.DocSeq;
            }
            dispatch({ type: "Saved", docId: row.DocId, docSeq: seq });
            if (captures.length >= 2) {
                dispatch({ type: "Lock" });
            } else {
                resetToNew();
            }
        } finally {
            dispatch({ type: "SetSaving", saving: false });
        }
    }, [captures, customFields, db, docId, fields, isLocked, printCount, resetToNew, dispatch]);

    const print = useCallback(async () => {
        if (!isLocked || !docId) return;
        dispatch({ type: "SetSaving", saving: true });
        try {
            const nextCount = printCount + 1;
            dispatch({ type: "Printed" });
            await db.saveDoc({
                DocId: docId,
                DocKind: "Ticket",
                Body: {
                    ...buildTicketBody(fields, captures, printCount, customFields),
                    PrintCount: nextCount,
                },
            });
        } finally {
            dispatch({ type: "SetSaving", saving: false });
        }
    }, [captures, customFields, db, docId, fields, isLocked, printCount, dispatch]);

    return { save, print };
};

interface TicketLifecycleDeps {
    captures: Capture[];
    isLocked: boolean;
    resetToNew: () => void;
    save: () => Promise<void>;
    dispatch: Dispatch<TicketAction>;
    indicator: ReturnType<typeof useIndicator>;
    tareFirst: boolean;
    multiGross: boolean;
}

// startNew/clear/resume: the three ways a ticket's identity changes out from
// under the form — parking the current one and moving on, discarding it, or
// swapping in a different saved one entirely.
const useTicketLifecycleActions = ({
    captures,
    isLocked,
    resetToNew,
    save,
    dispatch,
    indicator,
    tareFirst,
    multiGross,
}: TicketLifecycleDeps) => {
    // PLAN mock parity: the first "New ticket" click while work is unsaved
    // saves (and, with both weights in, locks) it rather than discarding it;
    // a second click then actually starts fresh.
    const startNew = useCallback(() => {
        if (captures.length > 0 && !isLocked) {
            void save();
        } else {
            resetToNew();
        }
    }, [captures.length, isLocked, resetToNew, save]);

    const resume = useCallback(
        (doc: DocRow) => {
            dispatch({ type: "Resumed", doc, tareFirst, multiGross });
            indicator.reset?.();
        },
        [dispatch, indicator, tareFirst, multiGross],
    );

    return { startNew, resume };
};

// The reducer itself plus the one derived effect that keeps `kind` in sync
// with `captures`/tareFirst/multiGross, and the `resetToNew` action every
// other sub-hook above needs a reference to — kept together since they all
// revolve around the same `dispatch`.
const useTicketState = (
    tareFirst: boolean,
    multiGross: boolean,
    indicator: ReturnType<typeof useIndicator>,
) => {
    const [state, dispatch] = useReducer(ticketReducer, undefined, () =>
        initialTicketState(tareFirst, multiGross),
    );

    useEffect(() => {
        // Only steps in when the *current* kind has genuinely stopped being
        // a valid choice (captured already, and MultiGross doesn't allow
        // re-picking it) or there's no kind at all yet. Bug fix: this used
        // to unconditionally recompute "the" default from `captures` alone
        // and overwrite `state.kind` whenever it differed — which fired
        // right after the operator's own manual SegmentedControl pick
        // (ActionsCard.tsx) dispatched a *different* kind than the
        // order-based default, silently snapping it back and making the
        // Tare/Gross toggle look broken.
        const kindStillValid =
            state.kind !== null &&
            !(hasCapture(state.captures, state.kind) && !(multiGross && state.kind === "Gross"));
        if (kindStillValid) return;
        const next = defaultCaptureKind(state.captures, tareFirst, multiGross);
        if (next !== state.kind) dispatch({ type: "SetKind", kind: next });
    }, [state.captures, state.kind, tareFirst, multiGross]);

    const resetToNew = useCallback(() => {
        dispatch({ type: "ResetToNew", tareFirst, multiGross });
        indicator.reset?.();
    }, [indicator, tareFirst, multiGross]);

    return { state, dispatch, resetToNew };
};

interface AssembleTicketArgs {
    state: TicketState;
    fieldActions: ReturnType<typeof useTicketFieldActions>;
    captureActions: ReturnType<typeof useTicketCaptureActions>;
    persistenceActions: ReturnType<typeof useTicketPersistenceActions>;
    lifecycleActions: ReturnType<typeof useTicketLifecycleActions>;
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
    isLocked: state.isLocked,
    printCount: state.printCount,
    saving: state.saving,
    capture: captureActions.capture,
    manualCapture: captureActions.manualCapture,
    useStoredTare: captureActions.useStoredTare,
    save: persistenceActions.save,
    startNew: lifecycleActions.startNew,
    resume: lifecycleActions.resume,
    print: persistenceActions.print,
});

// `tareFirst` (Settings, Weighing pane — "Applied immediately" per the
// mock's own card header) only sets which weight is offered first; it can
// change mid-session, so every place it decides the default kind re-derives
// on change rather than being captured once at mount. `operatorName` is the
// mock's own "Operator on duty" (Settings' Appearance pane, not admin-gated
// — a free-text label, not a login) stamped onto every capture; it too can
// change mid-shift, so it's read fresh at capture time rather than closed
// over once. `multiGross` (Settings → Weighing → Rules, task #46, default
// off) is the same shape — read fresh, not captured once — and only ever
// widens what `pushCapture`/`defaultCaptureKind` allow; with it off every
// code path below behaves exactly as it did before task #46.
export const useWeighingTicket = (
    tareFirst: boolean,
    operatorName: string,
    multiGross = false,
): UseWeighingTicket => {
    const db = useDataPort();
    const indicator = useIndicator();

    const { state, dispatch, resetToNew } = useTicketState(tareFirst, multiGross, indicator);
    const fieldActions = useTicketFieldActions(dispatch);
    const captureActions = useTicketCaptureActions({
        state: { kind: state.kind, isLocked: state.isLocked, captures: state.captures },
        dispatch,
        indicator,
        operatorName,
        multiGross,
    });
    const persistenceActions = useTicketPersistenceActions({
        docId: state.docId,
        captures: state.captures,
        fields: state.fields,
        customFields: state.customFields,
        printCount: state.printCount,
        isLocked: state.isLocked,
        db,
        dispatch,
        resetToNew,
    });
    const lifecycleActions = useTicketLifecycleActions({
        captures: state.captures,
        isLocked: state.isLocked,
        resetToNew,
        save: persistenceActions.save,
        dispatch,
        indicator,
        tareFirst,
        multiGross,
    });

    return assembleTicket({ state, fieldActions, captureActions, persistenceActions, lifecycleActions });
};
