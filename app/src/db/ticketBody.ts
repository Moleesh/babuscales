import { z } from "zod";

import type { JsonRecord } from "./types";

// The Ticket body shape: "A ticket does not have gross and
// tare columns — it has an ordered list of captures." This is the thin
// typed layer DataPort deliberately doesn't own (it just stores JSON);
// this is where a `Ticket`-kind doc's `Body` gets real structure.

export const CAPTURE_TYPES = ["Tare", "Gross"] as const;
export type CaptureType = (typeof CAPTURE_TYPES)[number];

export const CAPTURE_SOURCES = ["Indicator", "Manual", "StoredTare"] as const;
export type CaptureSource = (typeof CAPTURE_SOURCES)[number];

export interface Capture {
    CaptureId: string;
    Type: CaptureType;
    WeightKg: number;
    At: string;
    Operator: string;
    Source: CaptureSource;
    Images: string[];
}

export const captureSchema: z.ZodType<Capture> = z.object({
    CaptureId: z.string().min(1),
    Type: z.enum(CAPTURE_TYPES),
    WeightKg: z.number().int(),
    At: z.string().min(1),
    Operator: z.string().min(1),
    Source: z.enum(CAPTURE_SOURCES),
    Images: z.array(z.string()),
});

export interface TicketBody extends JsonRecord {
    BodyVersion: number;
    VehicleNo?: string;
    Party?: string;
    Material?: string;
    Transporter?: string;
    ChallanNo?: string;
    /** Operator-entered amount, same as any other manual ticket field — there is no auto-calc behind it; plain editable field, no formula. Undefined until the operator types one in. */
    Charge?: number;
    Captures: Capture[];
    /** "Printing is not a status either... a ticket carries a print count." */
    PrintCount?: number;
    /** Values for any Field in the active Schema whose FieldId isn't one of the 5 fixed ticket fields above — schema-driven custom fields. Keyed by FieldId. Absent/undefined is exactly equivalent to "no custom fields on this ticket" — fully backward compatible with every ticket saved before this existed. */
    CustomFields?: Record<string, string | number | boolean | null>;
}

const ticketBodyShape = z.object({
    BodyVersion: z.number().int().positive(),
    VehicleNo: z.string().optional(),
    Party: z.string().optional(),
    Material: z.string().optional(),
    Transporter: z.string().optional(),
    ChallanNo: z.string().optional(),
    Charge: z.number().optional(),
    Captures: z.array(captureSchema),
    PrintCount: z.number().int().nonnegative().optional(),
    CustomFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const emptyTicketBody = (): TicketBody => ({ BodyVersion: 1, Captures: [] });

/**
 * Validates and upcasts a raw `doc.Body` into a `TicketBody`. `BodyVersion`
 * exists precisely so this can grow a `switch` without ever breaking a
 * historical record — there is only one version so far, so
 * this is currently a validating passthrough.
 */
export const parseTicketBody = (body: JsonRecord): TicketBody =>
    ticketBodyShape.passthrough().parse(body);

export const findCapture = (captures: Capture[], type: CaptureType): Capture | undefined =>
    captures.find((c) => c.Type === type);

export const hasCapture = (captures: Capture[], type: CaptureType): boolean =>
    findCapture(captures, type) !== undefined;

export interface DerivedWeights {
    tareKg: number | null;
    grossKg: number | null;
    netKg: number | null;
}

/** All Gross-type captures, in the order they were taken — a ticket always has at most one, so this is just the length-0-or-1 case. */
export const grossCaptures = (captures: Capture[]): Capture[] =>
    captures.filter((c) => c.Type === "Gross");

// "A ticket's status is the pair of weights and the net they
// produce." `grossKg` is the Gross capture's own weight; `netKg` is always
// `grossKg - tareKg` — never swapped, never absolute-valued. A lorry that
// somehow weighs in lower on Gross than Tare has no valid net tonnage, so
// that clamps to 0 rather than reporting a (wrong) positive number.
export const deriveWeights = (captures: Capture[]): DerivedWeights => {
    const tare = findCapture(captures, "Tare");
    const grosses = grossCaptures(captures);
    return {
        tareKg: tare?.WeightKg ?? null,
        grossKg: grosses.length ? grosses.reduce((sum, c) => sum + c.WeightKg, 0) : null,
        netKg:
            tare && grosses.length
                ? grosses.reduce((sum, c) => sum + Math.max(0, c.WeightKg - tare.WeightKg), 0)
                : null,
    };
};

/** Open means parked with exactly one weight, waiting for the second. */
export const isOpenTicket = (isCancelled: boolean, captures: Capture[]): boolean => {
    if (isCancelled) return false;
    const { tareKg, grossKg } = deriveWeights(captures);
    return (tareKg !== null) !== (grossKg !== null);
};

// Task: dropped the "Weigh tare first" setting — which weight comes in
// first is just whichever the operator's lorry happens to be (empty coming
// in, loaded going out), not something worth a global preference. A fresh
// ticket offers Tare by default (the common case — most lorries arrive
// empty), but the operator's own Tare/Gross toggle (ActionsCard.tsx) always
// lets them pick the other; once one weight is already in (fresh or
// resumed), the missing one is the only sensible next offer regardless of
// this default. Once both a Tare and a Gross exist, the pair is final: null
// — the ticket has nothing left to capture.
export const defaultCaptureKind = (captures: Capture[]): CaptureType | null => {
    const order: CaptureType[] = ["Tare", "Gross"];
    return order.find((kind) => !hasCapture(captures, kind)) ?? null;
};
