import { formatWeightKg } from "@constants/numberFormat";

import type { SlipData } from "./types";

export interface SlipInput {
    ticketNo: string;
    vehicleNo: string;
    party: string;
    material: string;
    challanNo: string;
    transporter: string;
    tareKg: number | null;
    grossKg: number | null;
    netKg: number | null;
    tareAt: string | null;
    grossAt: string | null;
    operator: string;
    /** The ticket's `PrintCount` *before* this print — 0 means this is the first (ORIGINAL). */
    printCount: number;
}

const weightOrDash = (kg: number | null): string => (kg === null ? "—" : formatWeightKg(kg));

const stampOrDash = (iso: string | null): string =>
    iso === null ? "—" : new Date(iso).toLocaleString();

// Mirrors the mock's `P()` — one function that turns live ticket state into
// the flat, already-formatted shape every paper-size renderer consumes.
export const buildSlipData = (input: SlipInput): SlipData => ({
    TicketNo: input.ticketNo,
    VehicleNo: input.vehicleNo || "—",
    Party: input.party || "—",
    Material: input.material || "—",
    ChallanNo: input.challanNo || "—",
    Transporter: input.transporter || "—",
    TareKg: weightOrDash(input.tareKg),
    GrossKg: weightOrDash(input.grossKg),
    NetKg: weightOrDash(input.netKg),
    TareAt: stampOrDash(input.tareAt),
    GrossAt: stampOrDash(input.grossAt),
    // No rate/charge engine yet (app/README.md known gap) — always "—",
    // same fallback the mock itself uses when `c.charge` is unset.
    Charge: "—",
    Operator: input.operator,
    Copy: input.printCount >= 1 ? `DUPLICATE COPY ${input.printCount + 1}` : "",
});
