import type { CaptureType } from "@db/ticketBody";

// PLAN §4.8 — an indicator is one of N named serial devices. This is the
// shape every source of weight readings shares: today a simulated deck
// (simulatedIndicator.ts), later a real Tauri serial-port adapter — the
// Weighing screen (Task 14) only ever talks to this interface.

export interface IndicatorReading {
    WeightKg: number;
    /** PLAN §13 — the capture control stays disabled until this is true. */
    Stable: boolean;
}

export type IndicatorListener = (reading: IndicatorReading) => void;

export interface IndicatorSource {
    getReading: () => IndicatorReading;
    /** Returns an unsubscribe function, React-effect-cleanup style. */
    subscribe: (listener: IndicatorListener) => () => void;
    /** Simulation-only controls — a real serial adapter has no "send a lorry" to press. Weighing renders these conditionally. */
    loadLorry?: (kind: CaptureType) => void;
    reset?: () => void;
}
