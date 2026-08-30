import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IndicatorReading } from "../types";
import {
    type LorryTickerState,
    resetLorryTicker,
    startLoadLorry,
    stopLorryTicker,
} from "./lorryPhysics";

const TICK_MS = 70;

const makeState = (rng: () => number): LorryTickerState => ({
    settleTicks: 5,
    closeEnoughKg: 5,
    reading: { WeightKg: 0, Stable: false },
    target: 0,
    settleCount: 0,
    timer: null,
    listeners: new Set(),
    rng,
});

describe("startLoadLorry / tickLorry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("picks a target within the Tare range, rounded", () => {
        // rng fixed at 0 -> lo end of the range.
        const state = makeState(() => 0);
        startLoadLorry(state, "Tare", { tareRangeKg: [1000, 2000], grossRangeKg: [5000, 8000] });
        expect(state.target).toBe(1000);
        stopLorryTicker(state);
    });

    it("picks a target within the Gross range for a Gross capture", () => {
        const state = makeState(() => 1); // hi end
        startLoadLorry(state, "Gross", { tareRangeKg: [1000, 2000], grossRangeKg: [5000, 8000] });
        expect(state.target).toBe(8000);
        stopLorryTicker(state);
    });

    it("bounces toward target and eventually settles Stable at exactly target (no jitter, rng=0.5)", () => {
        const state = makeState(() => 0.5); // zeroes out all (rng-0.5) jitter terms
        const readings: IndicatorReading[] = [];
        state.listeners.add((r) => readings.push(r));

        startLoadLorry(state, "Tare", { tareRangeKg: [1000, 1000], grossRangeKg: [0, 0] });
        expect(state.target).toBe(1000);

        // Drive many ticks — damped approach (delta*0.14/tick) then settle-hold ticks.
        for (let i = 0; i < 200; i += 1) {
            vi.advanceTimersByTime(TICK_MS);
            if (state.timer === null) break;
        }

        expect(state.timer).toBeNull(); // stopped itself once settled
        const last = readings.at(-1)!;
        expect(last.WeightKg).toBe(1000);
        expect(last.Stable).toBe(true);
    });

    it("never overshoots into instability once within closeEnoughKg (monotonic damped approach, no jitter)", () => {
        const state = makeState(() => 0.5);
        const seen: number[] = [];
        state.listeners.add((r) => seen.push(r.WeightKg));

        startLoadLorry(state, "Tare", { tareRangeKg: [1000, 1000], grossRangeKg: [0, 0] });
        state.reading = { WeightKg: 0, Stable: false }; // start far below target

        for (let i = 0; i < 100; i += 1) {
            vi.advanceTimersByTime(TICK_MS);
            if (state.timer === null) break;
        }

        // Damped approach toward 1000 should be monotonically non-decreasing
        // (delta is always positive here, jitter zeroed) until it settles.
        for (let i = 1; i < seen.length; i += 1) {
            expect(seen[i]).toBeGreaterThanOrEqual((seen[i - 1] ?? 0) - 1e-9);
        }
    });

    it("restarting startLoadLorry clears any prior timer before starting a new one", () => {
        const state = makeState(() => 0.5);
        startLoadLorry(state, "Tare", { tareRangeKg: [1000, 1000], grossRangeKg: [0, 0] });
        const firstTimer = state.timer;
        expect(firstTimer).not.toBeNull();

        startLoadLorry(state, "Gross", { tareRangeKg: [1000, 1000], grossRangeKg: [2000, 2000] });
        expect(state.timer).not.toBe(firstTimer);
        expect(state.target).toBe(2000);
        stopLorryTicker(state);
    });
});

describe("stopLorryTicker", () => {
    it("clears the timer and is a no-op when already stopped", () => {
        const state = makeState(() => 0.5);
        expect(state.timer).toBeNull();
        stopLorryTicker(state); // no throw on idle state
        expect(state.timer).toBeNull();
    });
});

describe("resetLorryTicker", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fast-forwards a mid-bounce reading to the settled target rather than freezing mid-jitter", () => {
        const state = makeState(() => 0.5);
        startLoadLorry(state, "Tare", { tareRangeKg: [1000, 1000], grossRangeKg: [0, 0] });
        vi.advanceTimersByTime(TICK_MS); // one tick in, still bouncing (timer !== null)
        expect(state.timer).not.toBeNull();

        resetLorryTicker(state);

        expect(state.reading).toEqual({ WeightKg: 1000, Stable: true });
        expect(state.timer).toBeNull();
        expect(state.target).toBe(0);
        expect(state.settleCount).toBe(0);
    });

    it("leaves an already-idle state's reading untouched", () => {
        const state = makeState(() => 0.5);
        state.reading = { WeightKg: 42, Stable: true };
        resetLorryTicker(state);
        // idle (timer null) path skips the freeze-to-target branch entirely
        expect(state.reading).toEqual({ WeightKg: 42, Stable: true });
        expect(state.target).toBe(0);
    });

    it("notifies listeners on reset", () => {
        const state = makeState(() => 0.5);
        const readings: IndicatorReading[] = [];
        state.listeners.add((r) => readings.push(r));
        resetLorryTicker(state);
        expect(readings).toHaveLength(1);
    });
});
