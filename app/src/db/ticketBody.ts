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

/** All Gross-type captures, in the order they were taken — task #46's multi-gross support; a single-gross ticket is just the length-1 case of this. */
export const grossCaptures = (captures: Capture[]): Capture[] =>
    captures.filter((c) => c.Type === "Gross");

// PLAN §7.4 — "a ticket's status is the pair of weights and the net they
// produce," generalised for task #46's multi-gross tickets: PLAN §7.1
// (line 429, tagged "(future)") spells the shape as
// `[Tare, Gross1, Gross2, Gross3…]`, "net computed per gross". `grossKg` is
// the *sum* of every Gross capture (the total material moved under this one
// ticket); `netKg` is the sum of each Gross's own net against the single
// Tare, NOT `grossKg - tareKg` — those only coincide when there is exactly
// one Gross capture (today's default, MultiGross off). CalcFormula shows the
// per-load breakdown so that distinction is never silently hidden from the
// operator.
export const deriveWeights = (captures: Capture[]): DerivedWeights => {
    const tare = findCapture(captures, "Tare");
    const grosses = grossCaptures(captures);
    return {
        tareKg: tare?.WeightKg ?? null,
        grossKg: grosses.length ? grosses.reduce((sum, c) => sum + c.WeightKg, 0) : null,
        netKg:
            tare && grosses.length
                ? grosses.reduce((sum, c) => sum + Math.abs(c.WeightKg - tare.WeightKg), 0)
                : null,
    };
};

/** PLAN §7.5 — open means parked with exactly one weight, waiting for the second (or, under multi-gross, waiting for the first Gross). */
export const isOpenTicket = (isCancelled: boolean, captures: Capture[]): boolean => {
    if (isCancelled) return false;
    const { tareKg, grossKg } = deriveWeights(captures);
    return (tareKg !== null) !== (grossKg !== null);
};

// The rule only sets which is offered first — the operator can always pick
// the other (PLAN §7.1's help text). Task #46: once both a Tare and a Gross
// exist, `multiGross` decides whether the pair is final (null — the mock's
// original behaviour, still the default) or whether another Gross can still
// be added (repeat-offer "Gross", never "Tare" again — PLAN's own
// `[Tare, Gross1, Gross2…]` shape, always exactly one Tare).
export const defaultCaptureKind = (
    captures: Capture[],
    tareFirst: boolean,
    multiGross = false,
): CaptureType | null => {
    const order: CaptureType[] = tareFirst ? ["Tare", "Gross"] : ["Gross", "Tare"];
    const next = order.find((kind) => !hasCapture(captures, kind));
    if (next) return next;
    return multiGross && hasCapture(captures, "Tare") ? "Gross" : null;
};
