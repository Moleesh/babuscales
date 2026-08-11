import type { UseWeighingTicket } from "../useWeighingTicket";

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the capture button's own label. Task #46: gate the "done" branch on
// `!ticket.kind`, not `isComplete` — under MultiGross, isComplete goes true
// after the first Gross and stays true while more loads are still
// capturable, but `kind` only turns null once the operator has actually run
// out of things to capture.
export const captureLabel = (ticket: UseWeighingTicket, multiGross: boolean): string => {
    if (!ticket.kind) return "Both weights captured";
    if (ticket.kind === "Gross") {
        return multiGross && ticket.isComplete ? "Capture another Gross" : "Capture Gross";
    }
    return "Capture Tare";
};

// Same gating as captureLabel above, for the button's caption line.
export const captureHint = (ticket: UseWeighingTicket, armed: boolean): string => {
    if (!ticket.kind) return "Save to finish this ticket";
    return armed ? "Stable — capture now" : "Waiting for a stable reading";
};
