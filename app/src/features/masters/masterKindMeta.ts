import { MASTER_KINDS } from "@db/types";
import type { MasterKind } from "@db/types";
import type { Localized } from "@i18n/types";

export interface MasterKindMeta {
    Kind: MasterKind;
    Label: Localized;
    SearchPlaceholder: Localized;
    AddNewLabel: Localized;
}

// PLAN §9.1 — "One screen for everything saved". Order matches the PLAN
// prose order (Parties · Materials · Vehicles · Vehicle Types ·
// Transporters · Places · Operators · Stored Tares).
export const MASTER_KIND_ORDER: MasterKind[] = [...MASTER_KINDS];

export const MASTER_KIND_META: Record<MasterKind, MasterKindMeta> = {
    Party: {
        Kind: "Party",
        Label: { en: "Parties" },
        SearchPlaceholder: { en: "Search parties…" },
        AddNewLabel: { en: "Add party" },
    },
    Material: {
        Kind: "Material",
        Label: { en: "Materials" },
        SearchPlaceholder: { en: "Search materials…" },
        AddNewLabel: { en: "Add material" },
    },
    Vehicle: {
        Kind: "Vehicle",
        Label: { en: "Vehicles" },
        SearchPlaceholder: { en: "Search vehicles…" },
        AddNewLabel: { en: "Add vehicle" },
    },
    VehicleType: {
        Kind: "VehicleType",
        Label: { en: "Vehicle types" },
        SearchPlaceholder: { en: "Search vehicle types…" },
        AddNewLabel: { en: "Add vehicle type" },
    },
    Transporter: {
        Kind: "Transporter",
        Label: { en: "Transporters" },
        SearchPlaceholder: { en: "Search transporters…" },
        AddNewLabel: { en: "Add transporter" },
    },
    Place: {
        Kind: "Place",
        Label: { en: "Places" },
        SearchPlaceholder: { en: "Search places…" },
        AddNewLabel: { en: "Add place" },
    },
    Operator: {
        Kind: "Operator",
        Label: { en: "Operators" },
        SearchPlaceholder: { en: "Search operators…" },
        AddNewLabel: { en: "Add operator" },
    },
    StoredTare: {
        Kind: "StoredTare",
        Label: { en: "Stored tares" },
        SearchPlaceholder: { en: "Search by vehicle…" },
        AddNewLabel: { en: "Add stored tare" },
    },
};
