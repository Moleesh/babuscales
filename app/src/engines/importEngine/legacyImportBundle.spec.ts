import { describe, expect, it } from "vitest";

import { LEGACY_BUNDLE_VERSION, parseLegacyBundle } from "./legacyImportBundle";

describe("parseLegacyBundle", () => {
    it("accepts a minimal valid bundle (version only)", () => {
        const bundle = parseLegacyBundle({ BundleVersion: LEGACY_BUNDLE_VERSION });
        expect(bundle.BundleVersion).toBe(1);
        expect(bundle.Parties).toBeUndefined();
    });

    it("accepts a full bundle with every optional section", () => {
        const raw = {
            BundleVersion: 1,
            Source: "VaultBill v2",
            Parties: [{ Name: "Acme", Email: "a@b.com", Phone: "123", Notes: "n" }],
            Materials: [{ Name: "Sand", Rate: 10 }],
            Vehicles: [{ Name: "TN01AB1234" }],
            VehicleTypes: [{ Name: "Truck" }],
            Transporters: [{ Name: "Fast" }],
            Places: [{ Name: "Chennai" }],
            Operators: [{ Name: "Ravi" }],
            StoredTares: [{ VehicleNo: "TN01AB1234", WeightKg: 1000, CapturedAt: "2026-01-01" }],
            Tickets: [{ LegacyId: "L1", TareKg: 1000, GrossKg: 2000 }],
        };
        const bundle = parseLegacyBundle(raw);
        expect(bundle.Parties).toHaveLength(1);
        expect(bundle.Tickets).toHaveLength(1);
    });

    it("throws on a wrong BundleVersion", () => {
        expect(() => parseLegacyBundle({ BundleVersion: 2 })).toThrow();
    });

    it("throws when BundleVersion is missing", () => {
        expect(() => parseLegacyBundle({})).toThrow();
    });

    it("throws on a non-object input", () => {
        expect(() => parseLegacyBundle("not an object")).toThrow();
        expect(() => parseLegacyBundle(null)).toThrow();
        expect(() => parseLegacyBundle([1, 2, 3])).toThrow();
    });
});

describe("parseLegacyBundle: per-entry validation", () => {
    it("throws when a name entry has a blank Name", () => {
        expect(() =>
            parseLegacyBundle({ BundleVersion: 1, Parties: [{ Name: "" }] }),
        ).toThrow();
    });

    it("throws when a ticket entry is missing LegacyId", () => {
        expect(() =>
            parseLegacyBundle({ BundleVersion: 1, Tickets: [{ TareKg: 1000 }] }),
        ).toThrow();
    });

    it("throws when a ticket's TareKg is not an integer", () => {
        expect(() =>
            parseLegacyBundle({ BundleVersion: 1, Tickets: [{ LegacyId: "L1", TareKg: 12.5 }] }),
        ).toThrow();
    });

    it("throws when a StoredTare entry is missing VehicleNo", () => {
        expect(() =>
            parseLegacyBundle({
                BundleVersion: 1,
                StoredTares: [{ WeightKg: 100, CapturedAt: "2026-01-01" }],
            }),
        ).toThrow();
    });

    it("rejects unknown top-level keys being required (extra keys just ignored, per zod default)", () => {
        // zod object() strips unknown keys by default rather than throwing —
        // pin that behaviour since a stray/misspelled bundle key should not
        // silently pass through into the parsed value.
        const bundle = parseLegacyBundle({ BundleVersion: 1, Bogus: "x" }) as Record<string, unknown>;
        expect(bundle.Bogus).toBeUndefined();
    });
});
