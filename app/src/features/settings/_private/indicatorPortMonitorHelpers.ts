import { invoke } from "@tauri-apps/api/core";

import { isSerialIndicatorSource } from "@engines/indicator";
import type { IndicatorSource } from "@engines/indicator";

import type { ConnectionsConfig } from "../settingsSchema";

// Split out of useIndicatorPortMonitor.ts (over the line budget —
// docs/CodingStandards.md) — the two plain (no-hooks) request helpers behind
// the Listen button, unchanged from the inline versions they replace.

// Hands the one shared serial connection back to the app's real indicator
// engine — same "Applied immediately" reopen App.tsx's own
// SerialConnectionSync does on a Connections change, deliberately duplicated
// here (rather than imported) since App.tsx's version is a component effect,
// not a plain callable. Without this, Listen taking over the port leaves the
// live weight readout disconnected until the operator resaves Connections or
// relaunches the app.
export const reconnectRealIndicator = (indicator: IndicatorSource, conn: ConnectionsConfig): void => {
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
export const openIndicatorPort = (conn: ConnectionsConfig): Promise<void> =>
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
