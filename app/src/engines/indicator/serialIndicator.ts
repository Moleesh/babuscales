import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { z } from "zod";

import { fromString, withinDecimalsAllowed } from "@engines/formulaEngine/Decimal";

import type {
    IndicatorConnectionConfig,
    IndicatorListener,
    IndicatorReading,
    SerialIndicatorSource,
    StabilityOptions,
} from "./types";
import { resetLorryTicker, startLoadLorry, stopLorryTicker } from "./_private/lorryPhysics";

const DEFAULT_SETTLE_TICKS = 5;
const DEFAULT_CLOSE_ENOUGH_KG = 20;

// Task: "sometime there might be invaid entries that are coming so check 3
// entries and decide if we need to update the main indiator on all page" —
// a misconfigured/noisy framing (Settings' own indicator-overflow/stall
// popup guards the *test* panel against this, but a real connected session
// can still occasionally mis-parse one garbled line into a wild number) must
// not flash every page's shared WeightDisplay with a single bad sample. Raw
// hardware samples are held in a 3-wide window (`rawBuffer`, below) before
// being trusted; the display only updates once those 3 agree with each
// other. One-off noise just slides through the window without ever being
// applied, since it won't agree with its neighbors.
const SANITY_WINDOW = 3;
// Same tolerance as `closeEnoughKg`'s own settle band — an outlier gate
// doesn't need a separate, stricter number than "close enough to be the
// same weight" already uses.
const SANITY_SPREAD_KG = DEFAULT_CLOSE_ENOUGH_KG;

// Same demo ranges as simulatedIndicator.ts's defaults — kept in step here
// rather than exported/shared, since this adapter's "Send to lorry" is a
// manual test aid layered on top of real hardware, not the primary way this
// build gets readings (unlike the simulated adapter, where it is).
const LORRY_TARE_RANGE_KG: readonly [number, number] = [12340, 13240];
const LORRY_GROSS_RANGE_KG: readonly [number, number] = [30500, 34000];

// The Tauri event payload is untrusted the same way any IPC boundary is
// (docs/CodingStandards.md §4) — Rust emits it, but a stale/mismatched
// build or a future devices/indicator.rs change could still send a shape
// this side doesn't expect. `safeParse`'d at the `listen()` callback below
// rather than trusted straight off `event.payload`.
const rawReadingEventSchema = z.object({ WeightKg: z.number() });
const indicatorErrorEventSchema = z.object({ Message: z.string() });

// The factory's mutable state, bundled so the connect/disconnect logic below
// can live as plain functions instead of closures nested inside the
// factory — that's what keeps createSerialIndicator itself short.
interface SerialIndicatorState {
    settleTicks: number;
    closeEnoughKg: number;
    history: number[];
    // Last `SANITY_WINDOW` raw samples, unfiltered — see `SANITY_WINDOW`'s
    // own comment. Separate from `history` (which only ever holds samples
    // that already passed this gate) so a run of noise doesn't get to
    // "vote" using values the display never actually showed.
    rawBuffer: number[];
    reading: IndicatorReading;
    connectionError: string | null;
    listeners: Set<IndicatorListener>;
    // "Send to lorry" on the real adapter (Settings' `ShowSendLorry`, off by
    // default here — see settingsSchema.ts) layers the same settle physics
    // simulatedIndicator.ts uses over this adapter's own readings, for
    // testing/demoing on hardware that isn't connected/available right now.
    // `target`/`settleCount`/`timer` are lorryPhysics.ts's own state shape;
    // while `timer` is running, incoming real hardware samples are ignored
    // (see pushSample) so the two don't fight over `state.reading`.
    target: number;
    settleCount: number;
    timer: ReturnType<typeof setInterval> | null;
    /** Injected randomness source for the "Send to lorry" test aid's settle physics (docs/CodingStandards.md §2) — set once in `createSerialIndicator` to `Math.random`. */
    rng: () => number;
    /** Active `Schema.DecimalsAllowed ?? false` — see `StabilityOptions.decimalsAllowed`'s own comment. Kept in sync via `updateOptions`, same as `settleTicks`/`closeEnoughKg`, since the schema hasn't loaded yet when this source is constructed. */
    decimalsAllowed: boolean;
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
    // A "Send to lorry" simulation is running — let it own `state.reading`
    // until it settles/is reset, same as a real deck would ignore nothing
    // but for a fundamentally different reason (there's no real deck under
    // this test aid to begin with).
    if (state.timer !== null) return;
    state.connectionError = null;

    // Weights are integers in kilograms everywhere in this codebase (§6),
    // unless the active schema's `DecimalsAllowed` is on — in which case a
    // fraction is fine, capped at the same <=2-digit limit
    // `Decimal.withinDecimalsAllowed` enforces everywhere else. Either way,
    // a non-finite sample (a garbled parse on the Rust side, or a future
    // protocol slipping something malformed through) must never enter the
    // sanity buffer below: `NaN > SANITY_SPREAD_KG` is always false, so an
    // un-guarded NaN would sail through the spread check undetected and
    // poison the stability window. Rejected here, before either buffer sees
    // it. `String(weightKg)` round-trips fine for any real kg reading (never
    // exponential notation) — `fromString` is reused here purely so the
    // <=2-digit cap logic lives in exactly one place (Decimal.ts), not
    // reimplemented via float arithmetic on this side too.
    const withinLimit = Number.isFinite(weightKg) && (() => {
        try {
            return withinDecimalsAllowed(fromString(String(weightKg)), state.decimalsAllowed);
        } catch {
            return false;
        }
    })();
    if (!withinLimit) {
        console.warn(`pushSample: rejected out-of-range weight sample ${weightKg}`);
        return;
    }

    // Sanity gate — see `SANITY_WINDOW`'s own comment. Every raw sample
    // slides into the window regardless of outcome, so a genuinely settling
    // weight (which naturally agrees with itself) starts passing again as
    // soon as `SANITY_WINDOW` real samples have arrived, without needing a
    // manual reset.
    state.rawBuffer.push(weightKg);
    if (state.rawBuffer.length > SANITY_WINDOW) {
        state.rawBuffer = state.rawBuffer.slice(-SANITY_WINDOW);
    }
    if (state.rawBuffer.length < SANITY_WINDOW) return;
    const spread = Math.max(...state.rawBuffer) - Math.min(...state.rawBuffer);
    if (spread > SANITY_SPREAD_KG) return;

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
    stopLorryTicker(state);
    state.connectionError = null;
    state.history = [];
    state.rawBuffer = [];
    state.reading = { WeightKg: 0, Stable: true };
    try {
        await invoke("open_indicator_port", {
            port: config.port,
            baud: config.baud,
            pattern: config.pattern || null,
            framing: {
                DataBits: config.framing.dataBits,
                Parity: config.framing.parity,
                StopBits: config.framing.stopBits,
                LineEnding: config.framing.lineEndingByte,
                ReverseDigits: config.framing.reverseDigits,
                StartChar: config.framing.startChar,
                EndChar: config.framing.endChar,
            },
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
    stopLorryTicker(state);
    try {
        await invoke("close_indicator_port");
    } catch (reason) {
        state.connectionError = reason instanceof Error ? reason.message : String(reason);
    }
    state.history = [];
    state.rawBuffer = [];
    state.reading = { WeightKg: 0, Stable: true };
    notifyAll(state);
};

export const createSerialIndicator = (): SerialIndicatorSource => {
    const state: SerialIndicatorState = {
        settleTicks: DEFAULT_SETTLE_TICKS,
        closeEnoughKg: DEFAULT_CLOSE_ENOUGH_KG,
        history: [],
        rawBuffer: [],
        reading: { WeightKg: 0, Stable: true },
        connectionError: null,
        listeners: new Set<IndicatorListener>(),
        target: 0,
        settleCount: 0,
        timer: null,
        rng: Math.random,
        decimalsAllowed: false,
    };

    // Set up once, for the app's lifetime — same singleton shape as the
    // simulated indicator (created once in App.tsx, never torn down), so
    // there's no unmount path that would need these unlisten functions.
    void listen<unknown>("indicator-reading", (event) => {
        const parsed = rawReadingEventSchema.safeParse(event.payload);
        if (!parsed.success) {
            console.warn("indicator-reading: rejected malformed event payload", parsed.error);
            return;
        }
        pushSample(state, parsed.data.WeightKg);
    });
    void listen<unknown>("indicator-error", (event) => {
        const parsed = indicatorErrorEventSchema.safeParse(event.payload);
        if (!parsed.success) {
            console.warn("indicator-error: rejected malformed event payload", parsed.error);
            return;
        }
        state.connectionError = parsed.data.Message;
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
        // Settings-gated (`ShowSendLorry` — WeighingScreen.tsx only passes
        // this through when the checkbox is on, off by default here). Always
        // present on the object itself, unlike the old accidental
        // adapter-tied hiding this replaces — see settingsSchema.ts's
        // `ShowSendLorry` comment.
        loadLorry: (kind) =>
            startLoadLorry(state, kind, {
                tareRangeKg: LORRY_TARE_RANGE_KG,
                grossRangeKg: LORRY_GROSS_RANGE_KG,
            }),
        reset: () => resetLorryTicker(state),
        updateOptions: (next: StabilityOptions) => {
            if (next.settleTicks !== undefined) state.settleTicks = next.settleTicks;
            if (next.closeEnoughKg !== undefined) state.closeEnoughKg = next.closeEnoughKg;
            if (next.decimalsAllowed !== undefined) state.decimalsAllowed = next.decimalsAllowed;
        },
    };
};
