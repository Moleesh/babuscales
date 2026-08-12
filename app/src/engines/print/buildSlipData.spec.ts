import { describe, expect, it } from "vitest";

import { buildSlipData, type SlipInput } from "./buildSlipData";

const baseInput: SlipInput = {
    ticketNo: "TKT-0001",
    vehicleNo: "TN01AB1234",
    party: "Acme Traders",
    material: "Sand",
    challanNo: "CH-1",
    transporter: "Fast Transport",
    tareKg: 1000,
    grossKg: 2500,
    netKg: 1500,
    tareAt: "2026-01-01T10:00:00.000Z",
    grossAt: "2026-01-01T11:00:00.000Z",
    grossLoads: [{ kg: 2500, at: "2026-01-01T11:00:00.000Z" }],
    operator: "Ravi",
    printCount: 0,
    charge: 250,
    amountDp: 2,
    verifyUrl: "https://example.com/v/doc1",
};

describe("buildSlipData", () => {
    it("passes through the identifying text fields verbatim", () => {
        const slip = buildSlipData(baseInput);
        expect(slip.TicketNo).toBe("TKT-0001");
        expect(slip.VehicleNo).toBe("TN01AB1234");
        expect(slip.Party).toBe("Acme Traders");
        expect(slip.Operator).toBe("Ravi");
        expect(slip.VerifyUrl).toBe("https://example.com/v/doc1");
    });

    it("blank text fields fall back to an em-dash", () => {
        const slip = buildSlipData({ ...baseInput, vehicleNo: "", party: "", challanNo: "", transporter: "" });
        expect(slip.VehicleNo).toBe("—");
        expect(slip.Party).toBe("—");
        expect(slip.ChallanNo).toBe("—");
        expect(slip.Transporter).toBe("—");
    });

    it("null weights render as em-dash, not '0' or 'null'", () => {
        const slip = buildSlipData({ ...baseInput, tareKg: null, grossKg: null, netKg: null });
        expect(slip.TareKg).toBe("—");
        expect(slip.GrossKg).toBe("—");
        expect(slip.NetKg).toBe("—");
    });

    it("null timestamps render as em-dash", () => {
        const slip = buildSlipData({ ...baseInput, tareAt: null, grossAt: null });
        expect(slip.TareAt).toBe("—");
        expect(slip.GrossAt).toBe("—");
    });

    it("null charge renders as em-dash regardless of amountDp", () => {
        const slip = buildSlipData({ ...baseInput, charge: null });
        expect(slip.Charge).toBe("—");
    });

    it("a real charge is formatted as money with the given decimal places", () => {
        const slip = buildSlipData({ ...baseInput, charge: 250, amountDp: 2 });
        expect(slip.Charge).toContain("250.00");
        const slipDp0 = buildSlipData({ ...baseInput, charge: 250, amountDp: 0 });
        expect(slipDp0.Charge).not.toContain(".00");
    });

});

describe("buildSlipData: Copy label and GrossLoads", () => {
    it("printCount 0 (first print) produces an empty Copy label", () => {
        expect(buildSlipData({ ...baseInput, printCount: 0 }).Copy).toBe("");
    });

    it("printCount >= 1 produces a DUPLICATE COPY N label, N = printCount + 1", () => {
        expect(buildSlipData({ ...baseInput, printCount: 1 }).Copy).toBe("DUPLICATE COPY 2");
        expect(buildSlipData({ ...baseInput, printCount: 3 }).Copy).toBe("DUPLICATE COPY 4");
    });

    it("maps grossLoads 1:1 into GrossLoads, formatting each Kg/At", () => {
        const slip = buildSlipData({
            ...baseInput,
            grossLoads: [
                { kg: 1000, at: "2026-01-01T11:00:00.000Z" },
                { kg: 500, at: null },
            ],
        });
        expect(slip.GrossLoads).toHaveLength(2);
        expect(slip.GrossLoads[0]!.Kg).not.toBe("—");
        expect(slip.GrossLoads[1]!.Kg).not.toBe("—");
        expect(slip.GrossLoads[1]!.At).toBe("—");
    });

    it("empty grossLoads array produces an empty GrossLoads array", () => {
        expect(buildSlipData({ ...baseInput, grossLoads: [] }).GrossLoads).toEqual([]);
    });

    it("VerifyUrl passes through null unchanged", () => {
        expect(buildSlipData({ ...baseInput, verifyUrl: null }).VerifyUrl).toBeNull();
    });
});
