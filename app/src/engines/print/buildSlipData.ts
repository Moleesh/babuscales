import { formatDateTime, formatMoney, formatWeightKg } from "@constants/numberFormat";

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
    /** Every Gross capture's own weight + timestamp, in capture order — see `SlipData.GrossLoads`. */
    grossLoads: { kg: number; at: string | null }[];
    operator: string;
    /** The ticket's `PrintCount` *before* this print — 0 means this is the first (ORIGINAL). */
    printCount: number;
    /** `engines/billing`'s `computeCharge` — `null` until both weights are in. */
    charge: number | null;
    /** Settings' `Formats.AmountDp`. */
    amountDp: 0 | 2;
    /** @engines/verification's resolved `{base}/v/{docId}` — null when unavailable, see SlipData.VerifyUrl. */
    verifyUrl: string | null;
    /** i18n's active language — decides the locale every timestamp on the slip renders in. */
    lang: string;
}

const weightOrDash = (kg: number | null): string => (kg === null ? "—" : formatWeightKg(kg));

const stampOrDash = (iso: string | null, lang: string): string =>
    iso === null ? "—" : formatDateTime(iso, lang);

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
    TareAt: stampOrDash(input.tareAt, input.lang),
    GrossAt: stampOrDash(input.grossAt, input.lang),
    GrossLoads: input.grossLoads.map((load) => ({
        Kg: weightOrDash(load.kg),
        At: stampOrDash(load.at, input.lang),
    })),
    Charge: input.charge === null ? "—" : formatMoney(input.charge, input.amountDp),
    Operator: input.operator,
    Copy: input.printCount >= 1 ? `DUPLICATE COPY ${input.printCount + 1}` : "",
    VerifyUrl: input.verifyUrl,
});
