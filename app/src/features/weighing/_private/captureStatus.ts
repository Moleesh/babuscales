import type { UseWeighingTicket } from "../useWeighingTicket";

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the capture button's own label. Task #46: gate the "done" branch on
// `!ticket.kind`, not `isComplete` — under MultiGross, isComplete goes true
// after the first Gross and stays true while more loads are still
// capturable, but `kind` only turns null once the operator has actually run
// out of things to capture. `t`-threaded (bug fix — these were hardcoded
// English strings, never localized even in the Tamil UI).
export const captureLabel = (
    ticket: UseWeighingTicket,
    multiGross: boolean,
    t: (key: string) => string,
): string => {
    if (!ticket.kind) return t("weigh.capture.bothCaptured");
    if (ticket.kind === "Gross") {
        return multiGross && ticket.isComplete
            ? t("weigh.capture.anotherGross")
            : t("weigh.capture.gross");
    }
    return t("weigh.capture.tare");
};

// Same gating as captureLabel above, for the button's caption line.
export const captureHint = (
    ticket: UseWeighingTicket,
    armed: boolean,
    t: (key: string) => string,
): string => {
    if (!ticket.kind) return t("weigh.capture.saveToFinish");
    return armed ? t("weigh.capture.stableNow") : t("weigh.capture.waitingForStable");
};
