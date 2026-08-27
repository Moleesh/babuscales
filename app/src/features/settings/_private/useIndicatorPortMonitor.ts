import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

import { isSerialIndicatorSource } from "@engines/indicator";
import type { IndicatorSource } from "@engines/indicator";

import type { ConnectionsConfig } from "../settingsSchema";

interface RawLineEvent {
    Line: string;
}
interface IndicatorErrorEvent {
    Message: string;
}
interface OverflowEvent {
    Bytes: number;
}
interface ReadingEvent {
    WeightKg: number;
}

// Most recent lines kept on screen — enough to see a few frames go by
// without the box growing unbounded while Listen is left running.
const MAX_LINES = 40;

// Task: "make the listen open a pop when it reads like 100-500 char or
// 19-20 rows" — the operator's own description of what a misconfigured/
// no-terminator indicator looked like in production (devices/indicator.rs's
// own `MAX_LINE_BYTES` cap uses the same reasoning). Backstop for the case
// `indicator-overflow` (below) doesn't catch: a device that does send
// *some* byte matching the configured terminator, just never near a valid
// weight, so line after line comes through parsed as noise and nothing
// ever reads. `MAX_LINES` (40) already exists for the log's own display
// budget; this fires well before that, once it's clear nothing usable is
// coming through.
const STALL_LINE_COUNT = 20;

// Hands the one shared serial connection back to the app's real indicator
// engine — same "Applied immediately" reopen App.tsx's own
// SerialConnectionSync does on a Connections change, deliberately duplicated
// here (rather than imported) since App.tsx's version is a component effect,
// not a plain callable. Without this, Listen taking over the port leaves the
// live weight readout disconnected until the operator resaves Connections or
// relaunches the app. Plain function (no hooks) so it doesn't count against
// useIndicatorPortMonitor's own line budget.
const reconnectRealIndicator = (indicator: IndicatorSource, conn: ConnectionsConfig): void => {
    if (!isSerialIndicatorSource(indicator)) return;
    if (!conn.IndicatorPort) {
        void indicator.disconnect();
        return;
    }
    void indicator.connect({
        port: conn.IndicatorPort,
        baud: conn.IndicatorBaud,
        pattern: conn.IndicatorPattern,
        framing: {
            dataBits: conn.IndicatorDataBits,
            parity: conn.IndicatorParity,
            stopBits: conn.IndicatorStopBits,
            lineEndingByte: conn.IndicatorLineEndingByte,
            reverseDigits: conn.IndicatorReverseDigits,
            startChar: conn.IndicatorStartChar,
            endChar: conn.IndicatorEndChar,
        },
    });
};

// The Listen button's `open_indicator_port` call, pulled out purely to keep
// useIndicatorPortMonitor under its own line budget — unchanged from the
// inline version it replaces.
const openIndicatorPort = (conn: ConnectionsConfig): Promise<void> =>
    invoke("open_indicator_port", {
        port: conn.IndicatorPort,
        baud: conn.IndicatorBaud,
        pattern: null,
        // Data bits/parity/stop bits/line ending come from the fields above
        // it (Listen is how the operator confirms those are actually right
        // — garbled text here means try a different value).
        // ReverseDigits/StartChar/EndChar don't matter for what's shown:
        // they only affect the parsed `indicator-reading` event's
        // extraction, and Listen only ever displays the raw
        // `indicator-raw-line` one verbatim — passed through anyway so
        // `open_indicator_port` sees a consistent framing object, not a
        // half-filled one.
        framing: {
            DataBits: conn.IndicatorDataBits,
            Parity: conn.IndicatorParity,
            StopBits: conn.IndicatorStopBits,
            LineEnding: conn.IndicatorLineEndingByte,
            ReverseDigits: false,
            StartChar: conn.IndicatorStartChar,
            EndChar: conn.IndicatorEndChar,
        },
    });

// Split out of IndicatorPortMonitor.tsx (over the line budget —
// docs/CodingStandards.md) — the open/listen/close plumbing behind its
// Listen button, unchanged from the inline version it replaces.
export const useIndicatorPortMonitor = (
    conn: ConnectionsConfig,
    indicator: IndicatorSource,
    unlocked: boolean,
) => {
    const [listening, setListening] = useState(false);
    const [lines, setLines] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    // Set once per Listen session, on the first sign this indicator's
    // output doesn't fit the configured framing (either the Rust-side
    // overflow cap or the "lots of lines, zero readings" backstop below) —
    // read by IndicatorPortMonitor.tsx to drive the warning popup. Not
    // reset until `start()` runs again, so it stays up until the operator
    // dismisses it or tries Listen again with different settings.
    const [overflow, setOverflow] = useState(false);
    const readingsSeenRef = useRef(0);
    const logRef = useRef<HTMLDivElement>(null);

    // Kept current on every render so both `stop()` and the unmount cleanup
    // below reconnect with whatever Connections config is live right now,
    // not whichever `conn` happened to be in scope when the effect/closure
    // was created.
    const connRef = useRef(conn);
    connRef.current = conn;
    const indicatorRef = useRef(indicator);
    indicatorRef.current = indicator;
    // Same story as the refs above: the unmount-cleanup effect below only
    // ever runs its setup once ([] deps, intentionally — see that effect's
    // own comment), so a plain `listening` read in its closure would always
    // see the value from that one mount render (false) and never fire. Kept
    // current on every render instead, so the cleanup reads the real
    // latest state when it actually returns.
    const listeningRef = useRef(listening);
    listeningRef.current = listening;

    useEffect(() => {
        if (!listening) return;
        const unlistenLine = listen<RawLineEvent>("indicator-raw-line", (event) => {
            setLines((previous) => {
                const next = [...previous.slice(-(MAX_LINES - 1)), event.payload.Line];
                // Backstop overflow check — see `STALL_LINE_COUNT`'s own
                // comment. `readingsSeenRef` (bumped by the
                // `indicator-reading` listener below) is read here rather
                // than depended on directly so this callback doesn't need
                // to be recreated (and re-subscribed) on every reading.
                if (next.length >= STALL_LINE_COUNT && readingsSeenRef.current === 0) {
                    flagOverflow();
                }
                return next;
            });
        });
        const unlistenReading = listen<ReadingEvent>("indicator-reading", () => {
            readingsSeenRef.current += 1;
        });
        // Rust-side cap (devices/indicator.rs's `MAX_LINE_BYTES`) — a
        // single "line" ran hundreds of bytes past the configured Line
        // ending without ever finding it. Distinct from `indicator-error`
        // (a real port failure) so it can drive its own quiet auto-stop
        // instead of just the small inline `⚠ ...` status line.
        const unlistenOverflow = listen<OverflowEvent>("indicator-overflow", () => {
            flagOverflow();
        });
        const unlistenError = listen<IndicatorErrorEvent>("indicator-error", (event) => {
            setError(event.payload.Message);
        });
        return () => {
            void unlistenLine.then((off) => off());
            void unlistenReading.then((off) => off());
            void unlistenOverflow.then((off) => off());
            void unlistenError.then((off) => off());
        };
    }, [listening]);

    // Autoscroll to the newest line — a fixed-height log the operator would
    // otherwise have to keep scrolling down manually while data streams in.
    useEffect(() => {
        const el = logRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [lines]);

    // Stop (and close the port) on unmount too — leaving the pane with
    // Listen still on must not hold the one shared serial connection open
    // forever, starving the app's own indicator engine of it.
    useEffect(() => {
        return () => {
            if (listeningRef.current) {
                void invoke("close_indicator_port").finally(() =>
                    reconnectRealIndicator(indicatorRef.current, connRef.current),
                );
            }
        };
    }, []);

    // Task: "this keeps looping, we need a start stop button (will always
    // start automatically, fail silently in case)" — the old `setOverflow`
    // calls above left `listening` on, so the raw-line listener kept firing,
    // kept seeing >= STALL_LINE_COUNT with zero readings, and kept popping
    // the modal back open right after it was dismissed. Stopping here (not
    // just flagging) actually closes the port and drops this effect's
    // subscriptions, so a bad framing now fails once and goes quiet instead
    // of nagging on every subsequent line. Guarded on `listeningRef` so a
    // race between the two overflow events (line-count backstop and the
    // Rust-side byte cap) can't call `stop()` twice.
    const flagOverflow = () => {
        setOverflow(true);
        if (listeningRef.current) void stop();
    };

    const start = async () => {
        setError(null);
        setLines([]);
        setOverflow(false);
        readingsSeenRef.current = 0;
        try {
            await openIndicatorPort(conn);
            setListening(true);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
    };

    const stop = async () => {
        setListening(false);
        try {
            await invoke("close_indicator_port");
        } catch {
            // Best-effort — Stop should never itself get stuck on a
            // failure to close a port that may already be gone.
        } finally {
            // Whether the close above succeeded or not, hand the port back
            // to the app's real live-weight connection — see
            // `reconnectRealIndicator`'s own comment.
            reconnectRealIndicator(indicatorRef.current, connRef.current);
        }
    };

    // "will always start automatically" — Listen used to need a manual
    // click every time the operator opened this pane; now it starts on its
    // own the moment a port is configured, same as the app's own live
    // indicator connection does (App.tsx's SerialConnectionSync). Still a
    // real Stop/Listen toggle below for the operator to pause it — this
    // only covers the initial "walked in, port's already set" case. `[]`
    // deps: fires once per mount, not on every `conn` edit (typing a new
    // port value mid-edit shouldn't yank the connection open underneath
    // the operator).
    // Same lock gate as the manual button (`disabled={!unlocked || ...}`) —
    // without it this would seize the one shared serial port out from under
    // the app's real indicator connection the moment the pane mounted, even
    // while Connections is still locked/read-only.
    const autoStarted = useRef(false);
    useEffect(() => {
        if (autoStarted.current) return;
        if (!unlocked || !conn.IndicatorPort) return;
        autoStarted.current = true;
        void start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unlocked]);

    return {
        listening,
        lines,
        error,
        overflow,
        dismissOverflow: () => setOverflow(false),
        logRef,
        toggle: () => void (listening ? stop() : start()),
    };
};
