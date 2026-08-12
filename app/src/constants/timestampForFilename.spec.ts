import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { timestampForFilename } from "./timestampForFilename";

describe("timestampForFilename", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("formats as YYYYMMDD-HHMM in local time", () => {
        vi.setSystemTime(new Date(2026, 2, 5, 9, 7)); // 5 Mar 2026, 09:07 local
        expect(timestampForFilename()).toBe("20260305-0907");
    });

    it("zero-pads single-digit month, day, hour and minute", () => {
        vi.setSystemTime(new Date(2026, 0, 1, 0, 5)); // 1 Jan 2026, 00:05 local
        expect(timestampForFilename()).toBe("20260101-0005");
    });
});
