import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IndicatorProvider } from "./IndicatorProvider";
import type { IndicatorListener, IndicatorReading, IndicatorSource } from "./types";
import { useIndicatorReading } from "./useIndicatorReading";

const fakeSource = (): IndicatorSource & { emit: (reading: IndicatorReading) => void } => {
    let reading: IndicatorReading = { WeightKg: 0, Stable: false };
    const listeners = new Set<IndicatorListener>();
    return {
        getReading: () => reading,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        emit: (next) => {
            reading = next;
            listeners.forEach((l) => l(next));
        },
    };
};

describe("useIndicatorReading", () => {
    it("returns the source's current reading and re-renders when the source notifies", () => {
        const source = fakeSource();
        const { result } = renderHook(() => useIndicatorReading(), {
            wrapper: ({ children }) => <IndicatorProvider source={source}>{children}</IndicatorProvider>,
        });
        expect(result.current).toEqual({ WeightKg: 0, Stable: false });

        act(() => source.emit({ WeightKg: 1234, Stable: true }));
        expect(result.current).toEqual({ WeightKg: 1234, Stable: true });
    });
});
