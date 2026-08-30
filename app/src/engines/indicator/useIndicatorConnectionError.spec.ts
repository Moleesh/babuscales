import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { IndicatorListener, IndicatorSource, SerialIndicatorSource } from "./types";
import { useIndicatorConnectionError } from "./useIndicatorConnectionError";

const simulatedSource = (): IndicatorSource => ({
    getReading: () => ({ WeightKg: 0, Stable: false }),
    subscribe: () => () => undefined,
});

const serialSource = (): SerialIndicatorSource & { emitError: (msg: string | null) => void } => {
    let error: string | null = null;
    const listeners = new Set<IndicatorListener>();
    return {
        getReading: () => ({ WeightKg: 0, Stable: false }),
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        listPorts: () => Promise.resolve([]),
        connect: () => Promise.resolve(undefined),
        disconnect: () => Promise.resolve(undefined),
        getConnectionError: () => error,
        updateOptions: () => undefined,
        emitError: (msg) => {
            error = msg;
            listeners.forEach((l) => l({ WeightKg: 0, Stable: false }));
        },
    };
};

describe("useIndicatorConnectionError", () => {
    it("always returns null for a simulated (non-serial) source", () => {
        const { result } = renderHook(() => useIndicatorConnectionError(simulatedSource()));
        expect(result.current).toBeNull();
    });

    it("returns the serial source's current connection error and updates on notify", () => {
        const source = serialSource();
        const { result } = renderHook(() => useIndicatorConnectionError(source));
        expect(result.current).toBeNull();
        act(() => source.emitError("port closed"));
        expect(result.current).toBe("port closed");
        act(() => source.emitError(null));
        expect(result.current).toBeNull();
    });
});
