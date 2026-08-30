import { beforeEach, describe, expect, it, vi } from "vitest";

// serialIndicator.ts talks to Tauri's IPC (`invoke`) and event bus
// (`listen`) at module scope (createSerialIndicator registers its
// `indicator-reading`/`indicator-error` listeners once, for the app's
// lifetime). Mocked here so the pure sample-processing logic
// (pushSample's sanity window + Stability gate + DecimalsAllowed cap) is
// testable without a real Tauri runtime.
const invokeMock = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const listeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock("@tauri-apps/api/core", () => ({
    invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
    listen: vi.fn((eventName: string, cb: (event: { payload: unknown }) => void) => {
        listeners.set(eventName, cb);
        return Promise.resolve(() => listeners.delete(eventName));
    }),
}));

const { createSerialIndicator } = await import("./serialIndicator");

const emitReading = (weightKg: unknown) => {
    listeners.get("indicator-reading")?.({ payload: { WeightKg: weightKg } });
};

const emitError = (message: unknown) => {
    listeners.get("indicator-error")?.({ payload: { Message: message } });
};

describe("createSerialIndicator / pushSample (via indicator-reading events)", () => {
    beforeEach(() => {
        invokeMock.mockReset();
        invokeMock.mockResolvedValue(undefined);
        listeners.clear();
    });

    it("holds Stable=true, WeightKg=0 before any sample arrives", () => {
        const source = createSerialIndicator();
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });

    it("does not go Stable until settleTicks (default 5) consecutive samples agree within closeEnoughKg (default 20)", () => {
        const source = createSerialIndicator();
        // First SANITY_WINDOW (3) samples only fill the sanity buffer; history
        // only starts accumulating once the sanity window itself is full, so
        // settleTicks (5) worth of history needs 3 + 5 - 1 = 7 total samples.
        for (const w of [1000, 1000, 1000, 1000, 1000, 1000]) emitReading(w);
        expect(source.getReading().Stable).toBe(false);
        emitReading(1000); // 7th sample -> history finally reaches settleTicks (5)
        expect(source.getReading()).toEqual({ WeightKg: 1000, Stable: true });
    });

    it("a single wild outlier sample is swallowed by the 3-wide sanity window, never reaching the display", () => {
        const source = createSerialIndicator();
        emitReading(1000);
        emitReading(1000);
        emitReading(99999); // wild outlier vs. its 2 neighbors -> spread > SANITY_SPREAD_KG (20)
        // Reading must still reflect the last *accepted* sample, not the outlier.
        expect(source.getReading().WeightKg).not.toBe(99999);
    });

    it("a genuinely settling run of samples resumes passing once 3 fresh samples agree again", () => {
        const source = createSerialIndicator();
        emitReading(1000);
        emitReading(1000);
        emitReading(99999); // rejected by sanity window
        // 3 fresh agreeing samples slide the outlier out of the window.
        emitReading(2000);
        emitReading(2000);
        emitReading(2000);
        expect(source.getReading().WeightKg).toBe(2000);
    });

    it("rejects a non-finite sample (NaN/Infinity) outright, never entering any buffer", () => {
        const source = createSerialIndicator();
        emitReading(NaN);
        emitReading(Infinity);
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });

    it("DecimalsAllowed off (default): rejects a fractional-kg sample", () => {
        const source = createSerialIndicator();
        emitReading(1000.5);
        emitReading(1000.5);
        emitReading(1000.5);
        // Never accepted -> reading stays at the untouched initial value.
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });

    it("DecimalsAllowed on: accepts a <=2-decimal-digit fractional sample", () => {
        const source = createSerialIndicator();
        source.updateOptions({ decimalsAllowed: true });
        emitReading(1000.25);
        emitReading(1000.25);
        emitReading(1000.25);
        expect(source.getReading().WeightKg).toBe(1000.25);
    });

    it("DecimalsAllowed on: still rejects more than 2 fractional digits", () => {
        const source = createSerialIndicator();
        source.updateOptions({ decimalsAllowed: true });
        emitReading(1000.123);
        emitReading(1000.123);
        emitReading(1000.123);
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });

    it("updateOptions applies settleTicks/closeEnoughKg live", () => {
        const source = createSerialIndicator();
        source.updateOptions({ settleTicks: 2, closeEnoughKg: 5 });
        emitReading(500);
        emitReading(500);
        emitReading(500); // 3rd sample fills the sanity window (3); history len 1
        emitReading(500); // 4th sample -> history len 2 satisfies settleTicks (2)
        expect(source.getReading()).toEqual({ WeightKg: 500, Stable: true });
    });

    it("malformed indicator-reading payload is rejected without throwing", () => {
        const source = createSerialIndicator();
        expect(() => emitReading("not-a-number")).not.toThrow();
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });
});

describe("createSerialIndicator / connection error events", () => {
    beforeEach(() => {
        invokeMock.mockReset();
        invokeMock.mockResolvedValue(undefined);
        listeners.clear();
    });

    it("surfaces an indicator-error event through getConnectionError", () => {
        const source = createSerialIndicator();
        expect(source.getConnectionError()).toBeNull();
        emitError("port disconnected");
        expect(source.getConnectionError()).toBe("port disconnected");
    });

    it("ignores a malformed indicator-error payload", () => {
        const source = createSerialIndicator();
        emitError({ not: "a string message" });
        expect(source.getConnectionError()).toBeNull();
    });
});

describe("createSerialIndicator / connect + disconnect", () => {
    beforeEach(() => {
        invokeMock.mockReset();
        listeners.clear();
    });

    it("connect() surfaces a rejected invoke as a connectionError rather than throwing", async () => {
        invokeMock.mockRejectedValueOnce(new Error("port busy"));
        const source = createSerialIndicator();
        await source.connect({
            port: "COM1",
            baud: 9600,
            pattern: "",
            framing: {
                dataBits: 8,
                parity: "none",
                stopBits: 1,
                lineEndingByte: 10,
                reverseDigits: false,
                startChar: "",
                endChar: "",
            },
        });
        expect(source.getConnectionError()).toBe("port busy");
    });

    it("connect() clears a prior connectionError and resets the reading on success", async () => {
        invokeMock.mockResolvedValue(undefined);
        const source = createSerialIndicator();
        emitError("stale error");
        expect(source.getConnectionError()).toBe("stale error");

        await source.connect({
            port: "COM1",
            baud: 9600,
            pattern: "",
            framing: {
                dataBits: 8,
                parity: "none",
                stopBits: 1,
                lineEndingByte: 10,
                reverseDigits: false,
                startChar: "",
                endChar: "",
            },
        });
        expect(source.getConnectionError()).toBeNull();
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });

    it("disconnect() resets history/reading and surfaces an invoke failure as connectionError", async () => {
        invokeMock.mockRejectedValueOnce(new Error("close failed"));
        const source = createSerialIndicator();
        await source.disconnect();
        expect(source.getConnectionError()).toBe("close failed");
        expect(source.getReading()).toEqual({ WeightKg: 0, Stable: true });
    });
});
