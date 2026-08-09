// "One content model, three layout engines" — the mock's own comment
// (demo/BabuScale-demo.html, just above `ticketA4`). `SlipData` is that one
// content model: everything a printed ticket needs, already formatted to
// strings so the render functions do no further rounding/locale work.
export interface SlipData {
    TicketNo: string;
    VehicleNo: string;
    Party: string;
    Material: string;
    ChallanNo: string;
    Transporter: string;
    TareKg: string;
    GrossKg: string;
    NetKg: string;
    TareAt: string;
    GrossAt: string;
    /** Always "—" — there is no rate/charge engine yet (app/README.md known gap). */
    Charge: string;
    Operator: string;
    /** "" for the first print, "DUPLICATE COPY N" after — mirrors the mock's `state.prints`/`p.copy`. */
    Copy: string;
}

export const PAPER_KINDS = ["a4", "th", "mx"] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];
