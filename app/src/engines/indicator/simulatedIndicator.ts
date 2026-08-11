import type { CaptureType } from "@db/ticketBody";

import type { IndicatorListener, IndicatorReading, IndicatorSource } from "./types";

const TICK_MS = 70;
/** PLAN §13 — "weight is only accepted after N consecutive stable readings". Settings' Weighing pane overrides these live (Stability gate — mock's `#setReads`/`#setBand`). */
const DEFAULT_SETTLE_TICKS = 12;
const DEFAULT_CLOSE_ENOUGH_KG = 40;

const DEFAULT_TARE_RANGE_KG: readonly [number, number] = [12340, 13240];
const DEFAULT_GROSS_RANGE_KG: readonly [number, number] = [30500, 34000];

export interface SimulatedIndicatorOptions {
    tareRangeKg?: readonly [number, number];
    grossRangeKg?: readonly [number, number];
    /** "readings in a row" — the mock's `#setReads`. */
    settleTicks?: number;
    /** "within ± kg of each other" — the mock's `#setBand`. */
    closeEnoughKg?: number;
}

export interface SimulatedIndicatorSource extends IndicatorSource {
    /** Drives the deck toward a random weight for `kind`, settling like a real lorry easing on. */
    loadLorry: (kind: CaptureType) => void;
    /** Deck cleared — back to a stable zero. */
    reset: () => void;
    /** Settings' Stability gate changes live ("Applied immediately", per the mock's own card header) — no real serial adapter is obliged to implement this, hence it lives only on the simulated source. */
    updateOptions: (options: SimulatedIndicatorOptions) => void;
}

const randomInRange = ([lo, hi]: readonly [number, number]): number =>
    lo + Math.random() * (hi - lo);

// The factory's mutable state, bundled so the settle physics below can live
// as a plain function instead of a closure nested inside the factory —
// that's what keeps createSimulatedIndicator itself short.
interface SimulatedIndicatorState {
    settleTicks: number;
    closeEnoughKg: number;
    reading: IndicatorReading;
    target: number;
    settleCount: number;
    timer: ReturnType<typeof setInterval> | null;
    listeners: Set<IndicatorListener>;
}

const notifyAll = (state: SimulatedIndicatorState): void => {
    for (const listener of state.listeners) listener(state.reading);
};

const stopSimulated = (state: SimulatedIndicatorState): void => {
    if (state.timer === null) return;
    clearInterval(state.timer);
    state.timer = null;
};

// The mock's settle physics (a real deck's damped bounce) rather than just
// snapping to the target, so the stability gate has something real to gate
// on: overshoot-and-settle while far away, a shrinking wobble as it nears
// `target`, then a hard stop once `settleTicks` consecutive close-enough
// ticks have passed.
const tickSimulated = (state: SimulatedIndicatorState): void => {
    const delta = state.target - state.reading.WeightKg;
    if (Math.abs(delta) > state.closeEnoughKg) {
        state.reading = {
            WeightKg: state.reading.WeightKg + delta * 0.14 + (Math.random() - 0.5) * 260,
            Stable: false,
        };
        state.settleCount = 0;
    } else if (state.settleCount < state.settleTicks) {
        state.reading = {
            WeightKg: state.target + (Math.random() - 0.5) * (30 - state.settleCount * 2),
            Stable: false,
        };
        state.settleCount += 1;
    } else {
        state.reading = { WeightKg: state.target, Stable: true };
        stopSimulated(state);
    }
    notifyAll(state);
};

// No hardware yet is not a reason the demo, training or development should
// stall (PLAN §4.8's "simulated indicator"). This reproduces the mock's
// settle physics (see tickSimulated above) rather than just snapping to the
// target, so the stability gate above has something real to gate on.
export const createSimulatedIndicator = (
    options: SimulatedIndicatorOptions = {},
): SimulatedIndicatorSource => {
    const tareRange = options.tareRangeKg ?? DEFAULT_TARE_RANGE_KG;
    const grossRange = options.grossRangeKg ?? DEFAULT_GROSS_RANGE_KG;

    const state: SimulatedIndicatorState = {
        settleTicks: options.settleTicks ?? DEFAULT_SETTLE_TICKS,
        closeEnoughKg: options.closeEnoughKg ?? DEFAULT_CLOSE_ENOUGH_KG,
        reading: { WeightKg: 0, Stable: true },
        target: 0,
        settleCount: 0,
        timer: null,
        listeners: new Set<IndicatorListener>(),
    };

    return {
        getReading: () => state.reading,
        subscribe: (listener) => {
            state.listeners.add(listener);
            return () => state.listeners.delete(listener);
        },
        loadLorry: (kind) => {
            state.target = Math.round(randomInRange(kind === "Tare" ? tareRange : grossRange));
            state.settleCount = 0;
            state.reading = { ...state.reading, Stable: false };
            stopSimulated(state);
            state.timer = setInterval(() => tickSimulated(state), TICK_MS);
            notifyAll(state);
        },
        reset: () => {
            stopSimulated(state);
            state.target = 0;
            state.settleCount = 0;
            state.reading = { WeightKg: 0, Stable: true };
            notifyAll(state);
        },
        updateOptions: (next) => {
            if (next.settleTicks !== undefined) state.settleTicks = next.settleTicks;
            if (next.closeEnoughKg !== undefined) state.closeEnoughKg = next.closeEnoughKg;
        },
    };
};
