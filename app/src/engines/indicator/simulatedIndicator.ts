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

// No hardware yet is not a reason the demo, training or development should
// stall (PLAN §4.8's "simulated indicator"). This reproduces the mock's
// settle physics (a real deck's damped bounce) rather than just snapping to
// the target, so the stability gate above has something real to gate on.
export const createSimulatedIndicator = (
    options: SimulatedIndicatorOptions = {},
): SimulatedIndicatorSource => {
    const tareRange = options.tareRangeKg ?? DEFAULT_TARE_RANGE_KG;
    const grossRange = options.grossRangeKg ?? DEFAULT_GROSS_RANGE_KG;
    let settleTicks = options.settleTicks ?? DEFAULT_SETTLE_TICKS;
    let closeEnoughKg = options.closeEnoughKg ?? DEFAULT_CLOSE_ENOUGH_KG;

    let reading: IndicatorReading = { WeightKg: 0, Stable: true };
    let target = 0;
    let settleCount = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    const listeners = new Set<IndicatorListener>();

    const notify = (): void => {
        for (const listener of listeners) listener(reading);
    };

    const stop = (): void => {
        if (timer === null) return;
        clearInterval(timer);
        timer = null;
    };

    const tick = (): void => {
        const delta = target - reading.WeightKg;
        if (Math.abs(delta) > closeEnoughKg) {
            reading = {
                WeightKg: reading.WeightKg + delta * 0.14 + (Math.random() - 0.5) * 260,
                Stable: false,
            };
            settleCount = 0;
        } else if (settleCount < settleTicks) {
            reading = {
                WeightKg: target + (Math.random() - 0.5) * (30 - settleCount * 2),
                Stable: false,
            };
            settleCount += 1;
        } else {
            reading = { WeightKg: target, Stable: true };
            stop();
        }
        notify();
    };

    return {
        getReading: () => reading,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        loadLorry: (kind) => {
            target = Math.round(randomInRange(kind === "Tare" ? tareRange : grossRange));
            settleCount = 0;
            reading = { ...reading, Stable: false };
            stop();
            timer = setInterval(tick, TICK_MS);
            notify();
        },
        reset: () => {
            stop();
            target = 0;
            settleCount = 0;
            reading = { WeightKg: 0, Stable: true };
            notify();
        },
        updateOptions: (next) => {
            if (next.settleTicks !== undefined) settleTicks = next.settleTicks;
            if (next.closeEnoughKg !== undefined) closeEnoughKg = next.closeEnoughKg;
        },
    };
};
