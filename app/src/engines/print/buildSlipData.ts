import { formatDateTimeInFmt, formatMoney, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";

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
    /** Settings' `Formats.WeightUnit` — every weight on the slip renders in it. */
    weightUnit: WeightUnit;
    /** Settings' `Formats.DateFmt`. */
    dateFmt: string;
    /** Settings' `Formats.TimeFmt`. */
    timeFmt: "24" | "12";
    /** @engines/verification's resolved `{base}/v/{docId}` — null when unavailable, see SlipData.VerifyUrl. */
    verifyUrl: string | null;
    /** i18n's active language — decides the locale every timestamp on the slip renders in. */
    lang: string;
}

const weightOrDash = (kg: number | null, unit: WeightUnit): string =>
    kg === null ? "—" : formatWeightIn(kg, unit);

const stampOrDash = (iso: string | null, lang: string, dateFmt: string, timeFmt: "24" | "12"): string =>
    iso === null ? "—" : formatDateTimeInFmt(iso, lang, dateFmt, timeFmt);

// Mirrors the mock's `P()` — one function that turns live ticket state into
// the flat, already-formatted shape every paper-size renderer consumes.
export const buildSlipData = (input: SlipInput): SlipData => ({
    TicketNo: input.ticketNo,
    VehicleNo: input.vehicleNo || "—",
    Party: input.party || "—",
    Material: input.material || "—",
    ChallanNo: input.challanNo || "—",
    Transporter: input.transporter || "—",
    TareKg: weightOrDash(input.tareKg, input.weightUnit),
    GrossKg: weightOrDash(input.grossKg, input.weightUnit),
    NetKg: weightOrDash(input.netKg, input.weightUnit),
    TareAt: stampOrDash(input.tareAt, input.lang, input.dateFmt, input.timeFmt),
    GrossAt: stampOrDash(input.grossAt, input.lang, input.dateFmt, input.timeFmt),
    GrossLoads: input.grossLoads.map((load) => ({
        Kg: weightOrDash(load.kg, input.weightUnit),
        At: stampOrDash(load.at, input.lang, input.dateFmt, input.timeFmt),
    })),
    Charge: input.charge === null ? "—" : formatMoney(input.charge, input.amountDp),
    Operator: input.operator,
    Copy: input.printCount >= 1 ? `DUPLICATE COPY ${input.printCount + 1}` : "",
    VerifyUrl: input.verifyUrl,
});
