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

// The real serial adapter's shape (serialIndicator.ts) and the type guard
// that discriminates it from the simulated one — deliberately kept in this
// Tauri-import-free file, not in serialIndicator.ts itself. Settings'
// ConnectionsPane and App.tsx's SerialConnectionSync bridge both need to
// ask "is this the real adapter?", and if that question lived next to the
// answer (in serialIndicator.ts, which imports @tauri-apps/api), importing
// it from anywhere reachable by the memory/Pages build would risk pulling
// Tauri code into a bundle that must never contain it — the same
// tree-shaking guarantee db/createDataPort.ts's own comment explains.
// Everything here is pure types plus one property-existence check: safe to
// import unconditionally, because nothing here imports anything Tauri.

export interface StabilityOptions {
    /** "readings in a row" — Settings' Stability gate (`ReadingsInRow`). */
    settleTicks?: number;
    /** "within ± kg of each other" — Settings' Stability gate (`BandKg`). */
    closeEnoughKg?: number;
}

/** "none" | "odd" | "even" — mirrors src-tauri/src/devices/indicator.rs's `IndicatorFraming.parity`. */
export type IndicatorParity = "none" | "odd" | "even";

/** The wire framing Rust wasn't previously asked about at all (task: "for
 * capturing the indicator setting ... what all settings do we use") — data
 * bits/parity/stop bits were hardcoded to 8-N-1, the line terminator to
 * `\n`, and there was no way to handle a reversed-digit indicator. Kept as
 * its own object (not flattened into `IndicatorConnectionConfig`) so it
 * maps 1:1 onto Rust's `IndicatorFraming` struct at the `invoke()` call
 * site in serialIndicator.ts. */
export interface IndicatorFramingConfig {
    dataBits: 5 | 6 | 7 | 8;
    parity: IndicatorParity;
    stopBits: 1 | 2;
    /** The line terminator as its raw decimal byte value (10 = LF, 13 =
     * CR) — a plain number instead of an LF/CR/CRLF picker, mirroring
     * `IndicatorFraming.line_ending`'s own `u8`. */
    lineEndingByte: number;
    reverseDigits: boolean;
    /** Simpler alternative to a Custom pattern regex — trims each line to
     * between these two single characters before extracting digits.
     * Empty = not bounded on that side. Ignored when a Custom pattern is
     * set. Mirrors `IndicatorFraming.start_char`/`end_char` (Rust). */
    startChar: string;
    endChar: string;
}

export interface IndicatorConnectionConfig {
    port: string;
    baud: number;
    /** Empty = the Rust side's built-in numeric-extraction fallback (src-tauri/src/devices/indicator.rs's `parse_weight`) rather than a per-brand pattern. */
    pattern: string;
    framing: IndicatorFramingConfig;
}

export interface SerialIndicatorSource extends IndicatorSource {
    listPorts: () => Promise<string[]>;
    connect: (config: IndicatorConnectionConfig) => Promise<void>;
    disconnect: () => Promise<void>;
    /** The last connection/read error from the Rust side (a dropped cable, a port already in use by another program) — surfaced, not thrown, so a hardware hiccup doesn't crash a ticket mid-capture. `null` once a connection is clean. */
    getConnectionError: () => string | null;
    /** Settings' Stability gate, applied identically to `simulatedIndicator.ts`'s own `updateOptions` — see that file's doc comment. */
    updateOptions: (options: StabilityOptions) => void;
}

/** True only for the real adapter — the simulated one has neither `connect` nor `listPorts`. */
export const isSerialIndicatorSource = (source: IndicatorSource): source is SerialIndicatorSource =>
    "connect" in source && "listPorts" in source;
