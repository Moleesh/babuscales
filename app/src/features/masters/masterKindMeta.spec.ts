import { describe, expect, it } from "vitest";

import type { MasterColumn, Schema } from "@engines/schemaEngine";
import type { Translate } from "@i18n/types";

import { buildKindOptions, masterColumnLabel, MASTER_KIND_ORDER, visibleMasterKinds } from "./masterKindMeta";

const col = (overrides: Partial<MasterColumn>): MasterColumn => ({
    FieldId: "f1",
    Kind: "Text",
    ...overrides,
});

// Echoes the key back, matching the real I18nContextValue.t fallback
// contract that resolveFieldIdLabel relies on to detect "no translation".
const echoT: Translate = ((key: string) => key);

describe("visibleMasterKinds", () => {
    it("only includes kinds the schema's Masters block declares, in MASTER_KIND_ORDER order", () => {
        const schema = { Masters: [{ Kind: "Vehicle" }, { Kind: "Party" }] } as unknown as Schema;
        expect(visibleMasterKinds(schema)).toEqual(["Party", "Vehicle"]);
    });

    it("empty when Masters is missing entirely", () => {
        const schema = {} as Schema;
        expect(visibleMasterKinds(schema)).toEqual([]);
    });

    it("empty when Masters is an empty array", () => {
        const schema = { Masters: [] } as unknown as Schema;
        expect(visibleMasterKinds(schema)).toEqual([]);
    });
});

describe("buildKindOptions", () => {
    it("maps each kind to a SegmentedOption using the camelCase i18n key convention", () => {
        const options = buildKindOptions("en", echoT, ["Vehicle", "VehicleType", "StoredTare"]);
        expect(options).toEqual([
            { value: "Vehicle", label: "masters.vehicle.label" },
            { value: "VehicleType", label: "masters.vehicleType.label" },
            { value: "StoredTare", label: "masters.storedTare.label" },
        ]);
    });

    it("defaults to MASTER_KIND_ORDER when no kinds are given", () => {
        const options = buildKindOptions("en", echoT);
        expect(options.map((o) => o.value)).toEqual(MASTER_KIND_ORDER);
    });
});

describe("masterColumnLabel", () => {
    it("uses the column's own Label when present, resolved for the language", () => {
        const column = col({ FieldId: "custom", Label: { en: "Custom Field" } });
        expect(masterColumnLabel(column, "en", echoT)).toBe("Custom Field");
    });

    it("falls back to the built-in Masters label key for Rate/Email/Phone/Notes", () => {
        expect(masterColumnLabel(col({ FieldId: "Rate" }), "en", echoT)).toBe("masters.field.rate");
        expect(masterColumnLabel(col({ FieldId: "Email" }), "en", echoT)).toBe("masters.field.email");
        expect(masterColumnLabel(col({ FieldId: "Phone" }), "en", echoT)).toBe("masters.field.phone");
        expect(masterColumnLabel(col({ FieldId: "Notes" }), "en", echoT)).toBe("masters.field.notes");
    });

    it("falls through to resolveFieldIdLabel for any other FieldId with no Label", () => {
        // echoT returns the key unchanged, so resolveFieldIdLabel's own
        // "no real translation" branch kicks in and returns the raw FieldId.
        expect(masterColumnLabel(col({ FieldId: "BuyerRef" }), "en", echoT)).toBe("BuyerRef");
    });

    it("a built-in ticket FieldId (not a Masters-only one) resolves via the weigh.label chain", () => {
        const t: Translate = ((key: string) => (key === "weigh.label.vehicleNo" ? "Vehicle No" : key));
        expect(masterColumnLabel(col({ FieldId: "VehicleNo" }), "en", t)).toBe("Vehicle No");
    });
});
