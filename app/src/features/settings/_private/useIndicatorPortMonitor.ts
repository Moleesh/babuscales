import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";

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

// Split out of IndicatorPortMonitor.tsx (over the line budget —
// docs/CodingStandards.md) — the open/listen/close plumbing behind its
// Listen button, unchanged from the inline version it replaces.
export const useIndicatorPortMonitor = (conn: ConnectionsConfig) => {
    const [listening, setListening] = useState(false);
    const [lines, setLines] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

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
            if (listening) void invoke("close_indicator_port");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only cleanup, deliberately not re-running mid-session
    }, []);

    const start = async () => {
        setError(null);
        setLines([]);
        try {
            await invoke("open_indicator_port", {
                port: conn.IndicatorPort,
                baud: conn.IndicatorBaud,
                pattern: null,
                // Data bits/parity/stop bits/line ending come from the
                // fields above it (Listen is how the operator confirms
                // those are actually right — garbled text here means try a
                // different value). ReverseDigits/StartChar/EndChar don't
                // matter for what's shown: they only affect the parsed
                // `indicator-reading` event's extraction, and Listen only
                // ever displays the raw `indicator-raw-line` one verbatim
                // — passed through anyway so `open_indicator_port` sees a
                // consistent framing object, not a half-filled one.
                framing: {
                    DataBits: conn.IndicatorDataBits,
                    Parity: conn.IndicatorParity,
                    StopBits: conn.IndicatorStopBits,
                    LineEnding: conn.IndicatorLineEnding,
                    ReverseDigits: false,
                    StartChar: conn.IndicatorStartChar,
                    EndChar: conn.IndicatorEndChar,
                },
            });
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
        }
    };

    return { listening, lines, error, logRef, toggle: () => void (listening ? stop() : start()) };
};
