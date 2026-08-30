import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSimulatedIndicator } from "./simulatedIndicator";

describe("createSimulatedIndicator", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts idle: Stable true, WeightKg 0", () => {
        const source = createSimulatedIndicator();
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });

    it("loadLorry picks a target within the configured Tare range and settles Stable there", () => {
        const source = createSimulatedIndicator({
            tareRangeKg: [1000, 1000],
            grossRangeKg: [5000, 5000],
            settleTicks: 3,
            closeEnoughKg: 40,
        });
        source.loadLorry("Tare");
        for (let i = 0; i < 200; i += 1) vi.advanceTimersByTime(70);
        expect(source.getReading()).toEqual({ WeightKg: 1000, Stable: true });
    });

    it("loadLorry picks a target within the configured Gross range for Gross captures", () => {
        const source = createSimulatedIndicator({
            tareRangeKg: [1000, 1000],
            grossRangeKg: [8000, 8000],
            settleTicks: 3,
            closeEnoughKg: 40,
        });
        source.loadLorry("Gross");
        for (let i = 0; i < 200; i += 1) vi.advanceTimersByTime(70);
        expect(source.getReading()).toEqual({ WeightKg: 8000, Stable: true });
    });

    it("subscribe delivers readings and its cleanup unsubscribes", () => {
        const source = createSimulatedIndicator({
            tareRangeKg: [500, 500],
            grossRangeKg: [500, 500],
            settleTicks: 2,
            closeEnoughKg: 40,
        });
        const seen: number[] = [];
        const unsubscribe = source.subscribe((r) => seen.push(r.WeightKg));
        source.loadLorry("Tare");
        vi.advanceTimersByTime(70);
        expect(seen.length).toBeGreaterThan(0);

        unsubscribe();
        const countAtUnsub = seen.length;
        vi.advanceTimersByTime(70 * 10);
        expect(seen.length).toBe(countAtUnsub);
    });

    it("reset() stops mid-bounce and freezes at the settled target", () => {
        const source = createSimulatedIndicator({
            tareRangeKg: [900, 900],
            grossRangeKg: [900, 900],
            settleTicks: 20,
            closeEnoughKg: 5,
        });
        source.loadLorry("Tare");
        vi.advanceTimersByTime(70); // one tick in, mid-bounce
        source.reset();
        expect(source.getReading()).toEqual({ WeightKg: 900, Stable: true });
    });

    it("updateOptions changes settleTicks/closeEnoughKg used by a subsequent loadLorry", () => {
        const source = createSimulatedIndicator({ tareRangeKg: [700, 700], grossRangeKg: [700, 700] });
        source.updateOptions({ settleTicks: 1, closeEnoughKg: 1000 });
        source.loadLorry("Tare");
        // With closeEnoughKg huge, the very first tick is already "close enough"
        // and settleTicks=1 means it settles almost immediately.
        for (let i = 0; i < 5; i += 1) vi.advanceTimersByTime(70);
        expect(source.getReading().Stable).toBe(true);
    });
});
