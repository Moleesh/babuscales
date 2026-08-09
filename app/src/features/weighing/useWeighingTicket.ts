import { useCallback, useEffect, useState } from "react";

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
    useStoredTare: (weightKg: number, capturedAtIso: string) => void;
    save: () => Promise<void>;
    startNew: () => void;
    clear: () => void;
    resume: (doc: DocRow) => void;
    print: () => Promise<void>;
}

// `tareFirst` (Settings, Weighing pane — "Applied immediately" per the
// mock's own card header) only sets which weight is offered first; it can
// change mid-session, so every place it decides the default kind re-derives
// on change rather than being captured once at mount. `operatorName` is the
// mock's own "Operator on duty" (Settings' Appearance pane, not admin-gated
// — a free-text label, not a login) stamped onto every capture; it too can
// change mid-shift, so it's read fresh at capture time rather than closed
// over once.
export const useWeighingTicket = (tareFirst: boolean, operatorName: string): UseWeighingTicket => {
    const db = useDataPort();
    const indicator = useIndicator();

    const [docId, setDocId] = useState<string | null>(null);
    const [docSeq, setDocSeq] = useState<number | null>(null);
    const [fields, setFields] = useState<TicketFormFields>(emptyFields());
    const [recalledFields, setRecalledFields] = useState<Set<RecalledField>>(new Set());
    const [captures, setCaptures] = useState<Capture[]>([]);
    const [kind, setKindState] = useState<CaptureType | null>(defaultCaptureKind([], tareFirst));
    const [isLocked, setIsLocked] = useState(false);
    const [printCount, setPrintCount] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setKindState((current) => {
            const next = defaultCaptureKind(captures, tareFirst);
            return current !== next ? next : current;
        });
    }, [captures, tareFirst]);

    const setField = useCallback((key: keyof TicketFormFields, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    }, []);

    const applyRecalledFields = useCallback(
        (values: Partial<Pick<TicketFormFields, RecalledField>>) => {
            setFields((prev) => ({ ...prev, ...values }));
            setRecalledFields((prev) => {
                const next = new Set(prev);
                for (const key of Object.keys(values) as RecalledField[]) next.add(key);
                return next;
            });
        },
        [],
    );

    const resetToNew = useCallback(() => {
        setDocId(null);
        setDocSeq(null);
        setFields(emptyFields());
        setRecalledFields(new Set());
        setCaptures([]);
        setKindState(defaultCaptureKind([], tareFirst));
        setIsLocked(false);
        setPrintCount(0);
        indicator.reset?.();
    }, [indicator, tareFirst]);

    const pushCapture = useCallback(
        (weightKg: number, source: Capture["Source"], capturedAtIso?: string) => {
            if (!kind || hasCapture(captures, kind) || isLocked) return;
            const capture: Capture = {
                CaptureId: newId(),
                Type: kind,
                WeightKg: Math.round(weightKg),
                At: capturedAtIso ?? new Date().toISOString(),
                Operator: operatorName,
                Source: source,
                Images: [],
            };
            setCaptures((prev) => [...prev, capture]);
            if (source === "Indicator") indicator.reset?.();
        },
        [captures, indicator, isLocked, kind, operatorName],
    );

    const capture = useCallback(
        (weightKg: number) => pushCapture(weightKg, "Indicator"),
        [pushCapture],
    );

    const useStoredTare = useCallback(
        (weightKg: number, capturedAtIso: string) =>
            pushCapture(weightKg, "StoredTare", capturedAtIso),
        [pushCapture],
    );

    const buildBody = useCallback((): TicketBody => {
        const body = emptyTicketBody();
        return {
            ...body,
            VehicleNo: fields.vehicleNo.trim() || undefined,
            Party: fields.party.trim() || undefined,
            Material: fields.material.trim() || undefined,
            Transporter: fields.transporter.trim() || undefined,
            ChallanNo: fields.challanNo.trim() || undefined,
            Captures: captures,
            PrintCount: printCount,
        };
    }, [captures, fields, printCount]);

    const save = useCallback(async () => {
        if (isLocked || captures.length === 0) return;
        setSaving(true);
        try {
            const row = await db.saveDoc({
                DocId: docId ?? undefined,
                DocKind: "Ticket",
                Body: buildBody(),
            });
            let seq = row.DocSeq;
            if (seq === null) {
                const numbered = await db.allocateDocSeq(row.DocId);
                seq = numbered.DocSeq;
            }
            setDocId(row.DocId);
            setDocSeq(seq);

            if (captures.length >= 2) {
                setIsLocked(true);
            } else {
                resetToNew();
            }
        } finally {
            setSaving(false);
        }
    }, [buildBody, captures.length, db, docId, isLocked, resetToNew]);

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

    const clear = useCallback(() => {
        if (!isLocked) resetToNew();
    }, [isLocked, resetToNew]);

    const resume = useCallback(
        (doc: DocRow) => {
            const body = parseTicketBody(doc.Body);
            setDocId(doc.DocId);
            setDocSeq(doc.DocSeq);
            setFields({
                vehicleNo: body.VehicleNo ?? "",
                party: body.Party ?? "",
                material: body.Material ?? "",
                transporter: body.Transporter ?? "",
                challanNo: body.ChallanNo ?? "",
            });
            setRecalledFields(new Set());
            setCaptures(body.Captures);
            setKindState(defaultCaptureKind(body.Captures, tareFirst));
            // Mirrors save()'s own rule: two captures in means the ticket is
            // already finalised. Only PLAN §7.5's open (one-weight) tickets
            // should come back editable — a completed ticket resumed from
            // Reports must stay locked, not reopen for editing.
            setIsLocked(body.Captures.length >= 2);
            setPrintCount(body.PrintCount ?? 0);
            indicator.reset?.();
        },
        [indicator, tareFirst],
    );

    const print = useCallback(async () => {
        if (!isLocked || !docId) return;
        setSaving(true);
        try {
            const nextCount = printCount + 1;
            setPrintCount(nextCount);
            await db.saveDoc({
                DocId: docId,
                DocKind: "Ticket",
                Body: { ...buildBody(), PrintCount: nextCount },
            });
        } finally {
            setSaving(false);
        }
    }, [buildBody, db, docId, isLocked, printCount]);

    return {
        docId,
        docSeq,
        fields,
        setField,
        recalledFields,
        applyRecalledFields,
        captures,
        weights: deriveWeights(captures),
        kind,
        setKind: setKindState,
        isComplete: captures.length >= 2,
        isLocked,
        printCount,
        saving,
        capture,
        useStoredTare,
        save,
        startNew,
        clear,
        resume,
        print,
    };
};
