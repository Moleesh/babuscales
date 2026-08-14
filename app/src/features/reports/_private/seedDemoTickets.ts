import type { DataPort } from "@db/DataPort";
import { newId } from "@db/id";
import type { Capture } from "@db/ticketBody";
import type { DocDraft } from "@db/types";

import {
    DEMO_MATERIALS,
    DEMO_OPERATORS,
    DEMO_PARTIES,
    DEMO_TRANSPORTERS,
    DEMO_VEHICLES,
} from "./demoTicketFixtures";

// Dev-only demo-data seeder for the Reports screen (task: "add dummy data
// for Reports"). Never called on app start — only from the explicit,
// dev-gated "Add sample tickets" control in ReportsHeaderActions. Writes
// through the same `DataPort.saveDoc`/`allocateDocSeq` every real ticket
// uses (useWeighingTicket.ts's own `save()`), so seeded tickets are
// indistinguishable from real ones to every other screen — Tickets,
// Summary, Dashboard KPIs, exports all just see more `Ticket` docs.

/** How many fake tickets one click adds: 80 completed, 10 open (waiting on
 * the second weight), 10 cancelled — 100 total, enough variety to populate
 * every view without needing a click-count knob nobody would use. */
export const DEMO_TICKET_COUNTS = { completed: 80, open: 10, cancelled: 10 } as const;

const randomItem = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(Math.random() * items.length)];
    if (item === undefined) throw new Error("randomItem: empty list");
    return item;
};

const randomInt = (min: number, max: number): number =>
    Math.floor(min + Math.random() * (max - min + 1));

/** A timestamp somewhere in the last ~2 years, so seeded tickets spread
 * across Dashboard's day/week/month/year periods instead of all landing
 * "today". */
const randomPastIso = (): string => {
    const daysBack = randomInt(0, 730);
    const hour = randomInt(7, 18);
    const minute = randomInt(0, 59);
    const at = new Date();
    at.setDate(at.getDate() - daysBack);
    at.setHours(hour, minute, 0, 0);
    return at.toISOString();
};

const buildCapture = (type: Capture["Type"], weightKg: number, at: string): Capture => ({
    CaptureId: newId(),
    Type: type,
    WeightKg: weightKg,
    At: at,
    Operator: randomItem(DEMO_OPERATORS),
    Source: "Indicator",
    Images: [],
});

interface DemoTicketFields {
    VehicleNo: string;
    Party: string;
    Material: string;
    Transporter: string;
    ChallanNo: string;
}

const randomFields = (index: number): DemoTicketFields => ({
    VehicleNo: randomItem(DEMO_VEHICLES),
    Party: randomItem(DEMO_PARTIES),
    Material: randomItem(DEMO_MATERIALS),
    Transporter: randomItem(DEMO_TRANSPORTERS),
    ChallanNo: `DEMO-${1000 + index}`,
});

/** Tare-then-gross pair with a plausible net (2–18 tonnes), the tare
 * captured 20–90 minutes before the gross — mirrors a real loaded-vehicle
 * round trip, not two captures on top of each other. */
const buildWeighedCaptures = (secondAt: string): Capture[] => {
    const tareKg = randomInt(8000, 15000);
    const netKg = randomInt(2000, 18000);
    const first = new Date(secondAt);
    first.setMinutes(first.getMinutes() - randomInt(20, 90));
    return [
        buildCapture("Tare", tareKg, first.toISOString()),
        buildCapture("Gross", tareKg + netKg, secondAt),
    ];
};

const buildDraft = (index: number, captures: Capture[], isCancelled: boolean): DocDraft => ({
    DocKind: "Ticket",
    IsCancelled: isCancelled,
    Body: {
        BodyVersion: 1,
        ...randomFields(index),
        Captures: captures,
        PrintCount: 0,
    },
});

const buildDemoDraft = (index: number, kind: "completed" | "open" | "cancelled"): DocDraft => {
    const at = randomPastIso();
    if (kind === "open") {
        return buildDraft(index, [buildCapture("Tare", randomInt(8000, 15000), at)], false);
    }
    return buildDraft(index, buildWeighedCaptures(at), kind === "cancelled");
};

const demoDraftPlan = (): ("completed" | "open" | "cancelled")[] => [
    ...Array<"completed">(DEMO_TICKET_COUNTS.completed).fill("completed"),
    ...Array<"open">(DEMO_TICKET_COUNTS.open).fill("open"),
    ...Array<"cancelled">(DEMO_TICKET_COUNTS.cancelled).fill("cancelled"),
];

/** Inserts a batch of fake tickets via the real `DataPort`, allocating a
 * doc number for each exactly like `useWeighingTicket.save()` does, so they
 * sort and print like any real ticket. Opt-in only — the caller (a
 * dev-gated button) decides when this runs; nothing here runs on its own. */
export const seedDemoTickets = async (db: DataPort): Promise<void> => {
    const plan = demoDraftPlan();
    for (let index = 0; index < plan.length; index += 1) {
        const draft = buildDemoDraft(index, plan[index] ?? "completed");
        const row = await db.saveDoc(draft);
        await db.allocateDocSeq(row.DocId);
    }
};
