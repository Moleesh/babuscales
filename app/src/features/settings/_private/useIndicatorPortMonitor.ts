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

// Most recent lines kept on screen — enough to see a few frames go by
// without the box growing unbounded while Listen is left running.
const MAX_LINES = 40;

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
export const useIndicatorPortMonitor = (conn: ConnectionsConfig, indicator: IndicatorSource) => {
    const [listening, setListening] = useState(false);
    const [lines, setLines] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
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
            setLines((previous) => [...previous.slice(-(MAX_LINES - 1)), event.payload.Line]);
        });
        const unlistenError = listen<IndicatorErrorEvent>("indicator-error", (event) => {
            setError(event.payload.Message);
        });
        return () => {
            void unlistenLine.then((off) => off());
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

    const start = async () => {
        setError(null);
        setLines([]);
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

    return { listening, lines, error, logRef, toggle: () => void (listening ? stop() : start()) };
};
