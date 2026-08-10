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

// Real hardware has no "settle physics" to simulate — a raw sample arrives
// whenever the indicator's own protocol sends one, at whatever cadence
// that device uses (src-tauri/src/devices/indicator.rs emits one event per
// parsed line, nothing more). The stability gate is still exactly
// Settings' two knobs (ReadingsInRow, BandKg): stable once the last N raw
// samples all fall within ± BandKg of each other. Not shared with
// simulatedIndicator.ts's own settle logic because that file's is
// entangled with its tick-physics `target`/`settleCount`, which a real
// device doesn't have — same policy, a different, hardware-free input.
export const createSerialIndicator = (): SerialIndicatorSource => {
    let settleTicks = DEFAULT_SETTLE_TICKS;
    let closeEnoughKg = DEFAULT_CLOSE_ENOUGH_KG;
    let history: number[] = [];
    let reading: IndicatorReading = { WeightKg: 0, Stable: true };
    let connectionError: string | null = null;
    const listeners = new Set<IndicatorListener>();

    const notify = (): void => {
        for (const listener of listeners) listener(reading);
    };

    const pushSample = (weightKg: number): void => {
        connectionError = null;
        history.push(weightKg);
        if (history.length > settleTicks) history = history.slice(-settleTicks);
        const stable =
            history.length >= settleTicks &&
            Math.max(...history) - Math.min(...history) <= closeEnoughKg;
        reading = { WeightKg: weightKg, Stable: stable };
        notify();
    };

    // Set up once, for the app's lifetime — same singleton shape as the
    // simulated indicator (created once in App.tsx, never torn down), so
    // there's no unmount path that would need these unlisten functions.
    void listen<RawReadingEvent>("indicator-reading", (event) => {
        pushSample(event.payload.WeightKg);
    });
    void listen<IndicatorErrorEvent>("indicator-error", (event) => {
        connectionError = event.payload.Message;
        notify();
    });

    return {
        getReading: () => reading,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        listPorts: () => invoke<string[]>("list_serial_ports"),
        connect: async (config: IndicatorConnectionConfig) => {
            connectionError = null;
            history = [];
            reading = { WeightKg: 0, Stable: true };
            try {
                await invoke("open_indicator_port", {
                    port: config.port,
                    baud: config.baud,
                    pattern: config.pattern || null,
                });
            } catch (reason) {
                // Surfaced through getConnectionError(), not thrown — a
                // bad port/pattern must not become an unhandled rejection
                // for App.tsx's SerialConnectionSync, which calls this
                // with `void` the same way StabilityGateSync always has.
                connectionError = reason instanceof Error ? reason.message : String(reason);
            }
            notify();
        },
        disconnect: async () => {
            try {
                await invoke("close_indicator_port");
            } catch (reason) {
                connectionError = reason instanceof Error ? reason.message : String(reason);
            }
            history = [];
            reading = { WeightKg: 0, Stable: true };
            notify();
        },
        getConnectionError: () => connectionError,
        updateOptions: (next: StabilityOptions) => {
            if (next.settleTicks !== undefined) settleTicks = next.settleTicks;
            if (next.closeEnoughKg !== undefined) closeEnoughKg = next.closeEnoughKg;
        },
    };
};
