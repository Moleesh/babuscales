import type { CaptureType } from "@db/ticketBody";

import type { IndicatorListener, IndicatorReading } from "../types";

// Shared "settle physics" behind both indicator adapters' `loadLorry` —
// originally simulatedIndicator.ts-only, now also driving serialIndicator.ts
// so the "Show 'Send to lorry' button" setting actually works on
// the real/desktop build too, not just be hidden there. A damped bounce
// toward `target` rather than a snap, so the Stability gate has something
// real to gate on either way.
const TICK_MS = 70;

export interface LorryTickerOptions {
    tareRangeKg: readonly [number, number];
    grossRangeKg: readonly [number, number];
}

export interface LorryTickerState {
    settleTicks: number;
    closeEnoughKg: number;
    reading: IndicatorReading;
    target: number;
    settleCount: number;
    timer: ReturnType<typeof setInterval> | null;
    listeners: Set<IndicatorListener>;
    /** Injected randomness source (docs/CodingStandards.md §2 — engines don't call `Math.random()` directly). Production callers pass `Math.random` itself when building this state. */
    rng: () => number;
}

const randomInRange = ([lo, hi]: readonly [number, number], rng: () => number): number =>
    lo + rng() * (hi - lo);

const notifyAll = (state: LorryTickerState): void => {
    for (const listener of state.listeners) listener(state.reading);
};

export const stopLorryTicker = (state: LorryTickerState): void => {
    if (state.timer === null) return;
    clearInterval(state.timer);
    state.timer = null;
};

const tickLorry = (state: LorryTickerState): void => {
    const delta = state.target - state.reading.WeightKg;
    if (Math.abs(delta) > state.closeEnoughKg) {
        state.reading = {
            WeightKg: state.reading.WeightKg + delta * 0.14 + (state.rng() - 0.5) * 260,
            Stable: false,
        };
        state.settleCount = 0;
    } else if (state.settleCount < state.settleTicks) {
        state.reading = {
            WeightKg: state.target + (state.rng() - 0.5) * (30 - state.settleCount * 2),
            Stable: false,
        };
        state.settleCount += 1;
    } else {
        state.reading = { WeightKg: state.target, Stable: true };
        stopLorryTicker(state);
    }
    notifyAll(state);
};

export const startLoadLorry = (
    state: LorryTickerState,
    kind: CaptureType,
    { tareRangeKg, grossRangeKg }: LorryTickerOptions,
): void => {
    state.target = Math.round(randomInRange(kind === "Tare" ? tareRangeKg : grossRangeKg, state.rng));
    state.settleCount = 0;
    state.reading = { ...state.reading, Stable: false };
    stopLorryTicker(state);
    state.timer = setInterval(() => tickLorry(state), TICK_MS);
    notifyAll(state);
};

// Shared `reset()` for both indicator adapters — stops the "Send to
// lorry" bounce animation (if one was running) but does NOT force
// `state.reading`'s weight to zero. On the serial adapter this is a
// no-op display-wise: real hardware keeps reporting the scale's actual
// live weight regardless of any UI-side "reset", and overwrites `reading`
// again on its very next sample anyway (see pushSample). On the simulated
// adapter — the only place a ticker can actually be `timer !== null` mid-
// bounce — a reset caught mid-flight is fast-forwarded straight to its
// settled target instead of being frozen wherever the random jitter
// happened to land: freezing a mid-bounce sample would either hold an
// implausible weight or (if only `Stable` were forced true) lie about a
// jittery reading being settled. Already-settled/idle state (timer null)
// is untouched either way.
export const resetLorryTicker = (state: LorryTickerState): void => {
    if (state.timer !== null) {
        state.reading = { WeightKg: state.target, Stable: true };
    }
    stopLorryTicker(state);
    state.target = 0;
    state.settleCount = 0;
    notifyAll(state);
};
