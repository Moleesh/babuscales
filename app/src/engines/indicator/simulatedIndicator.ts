import type { CaptureType } from "@db/ticketBody";

import type { IndicatorListener, IndicatorSource } from "./types";
import { resetLorryTicker, startLoadLorry, type LorryTickerState } from "./_private/lorryPhysics";

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
    /** Stops any in-flight settle animation; the deck holds its last reading until the next `loadLorry`. */
    reset: () => void;
    /** Settings' Stability gate changes live ("Applied immediately", per the mock's own card header) — no real serial adapter is obliged to implement this, hence it lives only on the simulated source. */
    updateOptions: (options: SimulatedIndicatorOptions) => void;
}

// No hardware yet is not a reason the demo, training or development should
// stall (PLAN §4.8's "simulated indicator"). The settle physics themselves
// now live in `_private/lorryPhysics.ts`, shared with serialIndicator.ts's
// own (optional, settings-gated) `loadLorry`.
export const createSimulatedIndicator = (
    options: SimulatedIndicatorOptions = {},
): SimulatedIndicatorSource => {
    const tareRange = options.tareRangeKg ?? DEFAULT_TARE_RANGE_KG;
    const grossRange = options.grossRangeKg ?? DEFAULT_GROSS_RANGE_KG;

    const state: LorryTickerState = {
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
        loadLorry: (kind) =>
            startLoadLorry(state, kind, { tareRangeKg: tareRange, grossRangeKg: grossRange }),
        reset: () => resetLorryTicker(state),
        updateOptions: (next) => {
            if (next.settleTicks !== undefined) state.settleTicks = next.settleTicks;
            if (next.closeEnoughKg !== undefined) state.closeEnoughKg = next.closeEnoughKg;
        },
    };
};
