import { z } from "zod";

import type { JsonRecord } from "./types";

// The Ticket body shape — PLAN §7.1: "A ticket does not have gross and
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
    Captures: Capture[];
    /** PLAN §7.4 — "printing is not a status either... a ticket carries a print count." */
    PrintCount?: number;
}

const ticketBodyShape = z.object({
    BodyVersion: z.number().int().positive(),
    VehicleNo: z.string().optional(),
    Party: z.string().optional(),
    Material: z.string().optional(),
    Transporter: z.string().optional(),
    ChallanNo: z.string().optional(),
    Captures: z.array(captureSchema),
    PrintCount: z.number().int().nonnegative().optional(),
});

export const emptyTicketBody = (): TicketBody => ({ BodyVersion: 1, Captures: [] });

/**
 * Validates and upcasts a raw `doc.Body` into a `TicketBody`. `BodyVersion`
 * exists precisely so this can grow a `switch` without ever breaking a
 * historical record (PLAN §6.1) — there is only one version so far, so
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

/** PLAN §7.4 — "a ticket's status is the pair of weights and the net they produce." */
export const deriveWeights = (captures: Capture[]): DerivedWeights => {
    const tare = findCapture(captures, "Tare");
    const gross = findCapture(captures, "Gross");
    return {
        tareKg: tare?.WeightKg ?? null,
        grossKg: gross?.WeightKg ?? null,
        netKg: tare && gross ? Math.abs(gross.WeightKg - tare.WeightKg) : null,
    };
};

/** PLAN §7.5 — open means parked with exactly one weight, waiting for the second. */
export const isOpenTicket = (isCancelled: boolean, captures: Capture[]): boolean => {
    if (isCancelled) return false;
    const { tareKg, grossKg } = deriveWeights(captures);
    return (tareKg !== null) !== (grossKg !== null);
};

/** The rule only sets which is offered first — the operator can always pick the other (PLAN §7.1's help text). */
export const defaultCaptureKind = (captures: Capture[], tareFirst: boolean): CaptureType | null => {
    const order: CaptureType[] = tareFirst ? ["Tare", "Gross"] : ["Gross", "Tare"];
    return order.find((kind) => !hasCapture(captures, kind)) ?? null;
};
