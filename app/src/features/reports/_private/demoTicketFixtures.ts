// Dev-only fixture data for `seedDemoTickets.ts` — plausible-looking
// materials/parties/vehicles/transporters so seeded tickets don't all say
// "Party 1". Pure data, no logic; kept separate so `seedDemoTickets.ts`
// stays under the hook budget (docs/CodingStandards.md §1.2).

export const DEMO_MATERIALS: readonly string[] = [
    "Iron Ore",
    "Coal",
    "River Sand",
    "Blue Metal",
    "Cement",
    "Fly Ash",
    "Limestone",
    "Granite Chips",
];

export const DEMO_PARTIES: readonly string[] = [
    "Sri Balaji Traders",
    "Annai Minerals",
    "Kaveri Enterprises",
    "Murugan Transports",
    "Lakshmi Constructions",
    "Vetri Agro Industries",
];

export const DEMO_VEHICLES: readonly string[] = [
    "TN37AB1234",
    "TN45CD5678",
    "TN23EF9012",
    "TN66GH3456",
    "TN72JK7890",
    "TN59LM2345",
];

export const DEMO_TRANSPORTERS: readonly string[] = [
    "Suresh Logistics",
    "Amman Carriers",
    "Speed Roadways",
    "New Bharat Transport",
];

export const DEMO_OPERATORS: readonly string[] = ["Operator on duty", "Ravi Kumar", "Selvi M"];
