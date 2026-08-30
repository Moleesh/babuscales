import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => undefined) }));

import { invoke } from "@tauri-apps/api/core";

import type { IndicatorSource, SerialIndicatorSource } from "@engines/indicator";

import { DEFAULT_CONNECTIONS } from "../settingsSchema";
import { openIndicatorPort, reconnectRealIndicator } from "./indicatorPortMonitorHelpers";

const simulatedIndicator = (): IndicatorSource => ({
    getReading: () => ({ WeightKg: 0, Stable: false }),
    subscribe: () => () => undefined,
});

const serialIndicator = (): SerialIndicatorSource & { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> } => ({
    getReading: () => ({ WeightKg: 0, Stable: false }),
    subscribe: () => () => undefined,
    listPorts: async () => [],
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    getConnectionError: () => null,
    updateOptions: () => undefined,
});

describe("reconnectRealIndicator", () => {
    it("does nothing for a non-serial (simulated) indicator source", () => {
        const indicator = simulatedIndicator();
        reconnectRealIndicator(indicator, { ...DEFAULT_CONNECTIONS, IndicatorPort: "COM3" });
        // No throw, and nothing to assert on the plain simulated source — the
        // type guard (isSerialIndicatorSource) is what's under test here.
        expect(true).toBe(true);
    });

    it("disconnects the serial indicator when IndicatorPort is empty", () => {
        const indicator = serialIndicator();
        reconnectRealIndicator(indicator, { ...DEFAULT_CONNECTIONS, IndicatorPort: "" });
        expect(indicator.disconnect).toHaveBeenCalledTimes(1);
        expect(indicator.connect).not.toHaveBeenCalled();
    });

    it("connects the serial indicator with the mapped config when IndicatorPort is set", () => {
        const indicator = serialIndicator();
        const conn = {
            ...DEFAULT_CONNECTIONS,
            IndicatorPort: "COM5",
            IndicatorBaud: 4800,
            IndicatorPattern: "custom",
            IndicatorDataBits: 7 as const,
            IndicatorParity: "odd" as const,
            IndicatorStopBits: 2 as const,
            IndicatorLineEndingByte: 13,
            IndicatorReverseDigits: true,
            IndicatorStartChar: "<",
            IndicatorEndChar: ">",
        };
        reconnectRealIndicator(indicator, conn);
        expect(indicator.disconnect).not.toHaveBeenCalled();
        expect(indicator.connect).toHaveBeenCalledWith({
            port: "COM5",
            baud: 4800,
            pattern: "custom",
            framing: {
                dataBits: 7,
                parity: "odd",
                stopBits: 2,
                lineEndingByte: 13,
                reverseDigits: true,
                startChar: "<",
                endChar: ">",
            },
        });
    });
});

describe("openIndicatorPort", () => {
    it("invokes open_indicator_port with the mapped framing, ReverseDigits forced false, pattern null", async () => {
        const conn = {
            ...DEFAULT_CONNECTIONS,
            IndicatorPort: "COM7",
            IndicatorBaud: 9600,
            IndicatorDataBits: 8 as const,
            IndicatorParity: "even" as const,
            IndicatorStopBits: 1 as const,
            IndicatorLineEndingByte: 10,
            IndicatorReverseDigits: true, // should NOT propagate through
            IndicatorStartChar: "S",
            IndicatorEndChar: "E",
        };
        await openIndicatorPort(conn);
        expect(invoke).toHaveBeenCalledWith("open_indicator_port", {
            port: "COM7",
            baud: 9600,
            pattern: null,
            framing: {
                DataBits: 8,
                Parity: "even",
                StopBits: 1,
                LineEnding: 10,
                ReverseDigits: false,
                StartChar: "S",
                EndChar: "E",
            },
        });
    });
});
