import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import type {
    IndicatorConnectionConfig,
    IndicatorListener,
    IndicatorReading,
    SerialIndicatorSource,
    StabilityOptions,
} from "./types";

const DEFAULT_SETTLE_TICKS = 5;
const DEFAULT_CLOSE_ENOUGH_KG = 20;

interface RawReadingEvent {
    WeightKg: number;
}
interface IndicatorErrorEvent {
    Message: string;
}

// The factory's mutable state, bundled so the connect/disconnect logic below
// can live as plain functions instead of closures nested inside the
// factory — that's what keeps createSerialIndicator itself short.
interface SerialIndicatorState {
    settleTicks: number;
    closeEnoughKg: number;
    history: number[];
    reading: IndicatorReading;
    connectionError: string | null;
    listeners: Set<IndicatorListener>;
}

const notifyAll = (state: SerialIndicatorState): void => {
    for (const listener of state.listeners) listener(state.reading);
};

// Real hardware has no "settle physics" to simulate — a raw sample arrives
// whenever the indicator's own protocol sends one, at whatever cadence
// that device uses (src-tauri/src/devices/indicator.rs emits one event per
// parsed line, nothing more). The stability gate is still exactly
// Settings' two knobs (ReadingsInRow, BandKg): stable once the last N raw
// samples all fall within ± BandKg of each other. Not shared with
// simulatedIndicator.ts's own settle logic because that file's is
// entangled with its tick-physics `target`/`settleCount`, which a real
// device doesn't have — same policy, a different, hardware-free input.
const pushSample = (state: SerialIndicatorState, weightKg: number): void => {
    state.connectionError = null;
    state.history.push(weightKg);
    if (state.history.length > state.settleTicks) {
        state.history = state.history.slice(-state.settleTicks);
    }
    const stable =
        state.history.length >= state.settleTicks &&
        Math.max(...state.history) - Math.min(...state.history) <= state.closeEnoughKg;
    state.reading = { WeightKg: weightKg, Stable: stable };
    notifyAll(state);
};

const connectSerial = async (
    state: SerialIndicatorState,
    config: IndicatorConnectionConfig,
): Promise<void> => {
    state.connectionError = null;
    state.history = [];
    state.reading = { WeightKg: 0, Stable: true };
    try {
        await invoke("open_indicator_port", {
            port: config.port,
            baud: config.baud,
            pattern: config.pattern || null,
        });
    } catch (reason) {
        // Surfaced through getConnectionError(), not thrown — a bad
        // port/pattern must not become an unhandled rejection for
        // App.tsx's SerialConnectionSync, which calls this with `void`
        // the same way StabilityGateSync always has.
        state.connectionError = reason instanceof Error ? reason.message : String(reason);
    }
    notifyAll(state);
};

const disconnectSerial = async (state: SerialIndicatorState): Promise<void> => {
    try {
        await invoke("close_indicator_port");
    } catch (reason) {
        state.connectionError = reason instanceof Error ? reason.message : String(reason);
    }
    state.history = [];
    state.reading = { WeightKg: 0, Stable: true };
    notifyAll(state);
};

export const createSerialIndicator = (): SerialIndicatorSource => {
    const state: SerialIndicatorState = {
        settleTicks: DEFAULT_SETTLE_TICKS,
        closeEnoughKg: DEFAULT_CLOSE_ENOUGH_KG,
        history: [],
        reading: { WeightKg: 0, Stable: true },
        connectionError: null,
        listeners: new Set<IndicatorListener>(),
    };

    // Set up once, for the app's lifetime — same singleton shape as the
    // simulated indicator (created once in App.tsx, never torn down), so
    // there's no unmount path that would need these unlisten functions.
    void listen<RawReadingEvent>("indicator-reading", (event) => {
        pushSample(state, event.payload.WeightKg);
    });
    void listen<IndicatorErrorEvent>("indicator-error", (event) => {
        state.connectionError = event.payload.Message;
        notifyAll(state);
    });

    return {
        getReading: () => state.reading,
        subscribe: (listener) => {
            state.listeners.add(listener);
            return () => state.listeners.delete(listener);
        },
        listPorts: () => invoke<string[]>("list_serial_ports"),
        connect: (config) => connectSerial(state, config),
        disconnect: () => disconnectSerial(state),
        getConnectionError: () => state.connectionError,
        updateOptions: (next: StabilityOptions) => {
            if (next.settleTicks !== undefined) state.settleTicks = next.settleTicks;
            if (next.closeEnoughKg !== undefined) state.closeEnoughKg = next.closeEnoughKg;
        },
    };
};
