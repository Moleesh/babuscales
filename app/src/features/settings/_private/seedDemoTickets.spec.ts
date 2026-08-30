import { describe, expect, it, vi } from "vitest";

import type { DataPort } from "@db/DataPort";
import type { DocDraft, DocRow } from "@db/types";

import { DEMO_TICKET_COUNTS, seedDemoTickets } from "./seedDemoTickets";

describe("seedDemoTickets", () => {
    it("saves exactly completed+open+cancelled drafts, then allocates a doc seq for each", async () => {
        const saved: DocDraft[] = [];
        const allocated: string[] = [];
        const db = {
            saveDoc: vi.fn(async (draft: DocDraft) => {
                saved.push(draft);
                return { DocId: `id-${saved.length}`, ...draft } as unknown as DocRow;
            }),
            allocateDocSeq: vi.fn(async (docId: string) => {
                allocated.push(docId);
            }),
        } as unknown as DataPort;

        await seedDemoTickets(db);

        const total = DEMO_TICKET_COUNTS.completed + DEMO_TICKET_COUNTS.open + DEMO_TICKET_COUNTS.cancelled;
        expect(saved).toHaveLength(total);
        expect(allocated).toHaveLength(total);
    });

    it("produces the right mix of cancelled vs not, and open tickets carry only one capture", async () => {
        const saved: DocDraft[] = [];
        const db = {
            saveDoc: vi.fn(async (draft: DocDraft) => {
                saved.push(draft);
                return { DocId: `id-${saved.length}`, ...draft } as unknown as DocRow;
            }),
            allocateDocSeq: vi.fn(async () => undefined),
        } as unknown as DataPort;

        await seedDemoTickets(db);

        const cancelled = saved.filter((d) => d.IsCancelled === true);
        expect(cancelled).toHaveLength(DEMO_TICKET_COUNTS.cancelled);

        const captureCounts = saved.map((d) => (d.Body.Captures as unknown[]).length);
        const oneCaptureCount = captureCounts.filter((n) => n === 1).length;
        // Only "open" tickets have exactly one capture (a lone Tare).
        expect(oneCaptureCount).toBe(DEMO_TICKET_COUNTS.open);
        const twoCaptureCount = captureCounts.filter((n) => n === 2).length;
        expect(twoCaptureCount).toBe(DEMO_TICKET_COUNTS.completed + DEMO_TICKET_COUNTS.cancelled);
    });
});
