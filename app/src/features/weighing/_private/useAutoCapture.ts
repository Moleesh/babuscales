import { useEffect } from "react";

import type { IndicatorReading } from "@engines/indicator";
import type { SettingsBody } from "@features/settings";

import type { UseWeighingTicket } from "../useWeighingTicket";

export interface UseAutoCaptureArgs {
    reading: IndicatorReading;
    ticket: UseWeighingTicket;
    settings: SettingsBody;
    licenseGated: boolean;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — `armed` plus the Rules.AutoCapture effect that fires off of it, unchanged
// from the inline versions they replace.
//
// Task #46: `!!ticket.kind` alone is the right gate — `defaultCaptureKind`
// (@db/ticketBody) already returns null exactly when nothing more should be
// captured, and null out was the old `captures.length < 2`'s whole job.
// Dropping that clause is what lets a second (third, ...) Gross stay
// capturable when Settings → Weighing → Rules.MultiGross is on.
//
// Rules.AutoCapture (mock: `if (rules.autoCapture) setTimeout(capture, 350)`,
// fired once per settle) — the deck's own tick loop stops the instant it
// reports Stable, so `reading.WeightKg` is steady for the lifetime of this
// effect; nothing re-triggers the timer until the next `armed` transition.
export const useAutoCapture = ({ reading, ticket, settings, licenseGated }: UseAutoCaptureArgs): boolean => {
    const armed =
        reading.Stable && reading.WeightKg > 0 && !!ticket.kind && !ticket.isLocked && !licenseGated;

    useEffect(() => {
        if (!armed || !settings.Rules.AutoCapture) return;
        const timer = setTimeout(() => ticket.capture(reading.WeightKg), 350);
        return () => clearTimeout(timer);
    }, [armed, settings.Rules.AutoCapture, reading.WeightKg, ticket]);

    return armed;
};
