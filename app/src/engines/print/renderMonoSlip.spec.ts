import { describe, expect, it } from "vitest";

import { renderMatrixSlip, renderThermalSlip } from "./renderMonoSlip";
import type { SlipData } from "./types";

const baseSlip: SlipData = {
    TicketNo: "TKT-1",
    VehicleNo: "TN01AB1234",
    Party: "Acme",
    Material: "Sand",
    ChallanNo: "CH-1",
    Transporter: "Fast",
    TareKg: "1000",
    GrossKg: "2500",
    NetKg: "1500",
    TareAt: "01 Jan 10:00",
    GrossAt: "01 Jan 11:00",
    GrossLoads: [],
    Charge: "₹ 250.00",
    Operator: "Ravi",
    Copy: "",
    VerifyUrl: null,
};

describe("renderMatrixSlip", () => {
    it("shows ORIGINAL when Copy is empty (first print)", () => {
        expect(renderMatrixSlip(baseSlip)).toContain("ORIGINAL");
    });

    it("shows the Copy label instead of ORIGINAL on a reprint", () => {
        const out = renderMatrixSlip({ ...baseSlip, Copy: "DUPLICATE COPY 2" });
        expect(out).toContain("DUPLICATE COPY 2");
        expect(out).not.toContain("ORIGINAL");
    });

    it("converts ₹ to Rs. for the dot-matrix character set", () => {
        expect(renderMatrixSlip(baseSlip)).toContain("Rs.250.00");
        expect(renderMatrixSlip(baseSlip)).not.toContain("₹");
    });

    it("omits per-load lines when there is 0 or 1 GrossLoads entries", () => {
        expect(renderMatrixSlip({ ...baseSlip, GrossLoads: [] })).not.toContain("LOAD 1");
        expect(renderMatrixSlip({ ...baseSlip, GrossLoads: [{ Kg: "2500", At: "01 Jan 11:00" }] })).not.toContain(
            "LOAD 1",
        );
    });

    it("itemises each load once there are 2+ GrossLoads entries", () => {
        const out = renderMatrixSlip({
            ...baseSlip,
            GrossLoads: [
                { Kg: "1000", At: "01 Jan 11:00" },
                { Kg: "1500", At: "01 Jan 11:30" },
            ],
        });
        expect(out).toContain("LOAD 1");
        expect(out).toContain("LOAD 2");
    });
});

describe("renderThermalSlip", () => {
    it("prints the Verify line when VerifyUrl is present", () => {
        const out = renderThermalSlip({ ...baseSlip, VerifyUrl: "https://example.com/v/doc1" });
        expect(out).toContain("Verify");
        expect(out).toContain("https://example.com/v/doc1");
    });

    it("omits the Verify line entirely when VerifyUrl is null", () => {
        const out = renderThermalSlip({ ...baseSlip, VerifyUrl: null });
        expect(out).not.toContain("Verify");
    });

    it("itemises loads only when there are 2+ entries", () => {
        expect(renderThermalSlip({ ...baseSlip, GrossLoads: [] })).not.toContain("Load 1");
        const out = renderThermalSlip({
            ...baseSlip,
            GrossLoads: [
                { Kg: "1000", At: "01 Jan 11:00" },
                { Kg: "1500", At: "01 Jan 11:30" },
            ],
        });
        expect(out).toContain("Load 1");
        expect(out).toContain("Load 2");
    });
});
