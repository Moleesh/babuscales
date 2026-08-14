import type { UseWeighingTicket } from "../useWeighingTicket";

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the capture button's own label. `!ticket.kind` alone is ambiguous now:
// it's true both once genuinely both weights are in (`isComplete`) AND
// right after any single capture, while `awaitingSave` blocks the next one
// (useWeighingTicket) — those need different wording, so `isComplete` is
// checked first. `t`-threaded (bug fix — these were hardcoded English
// strings, never localized even in the Tamil UI).
export const captureLabel = (ticket: UseWeighingTicket, t: (key: string) => string): string => {
    if (ticket.isComplete) return t("weigh.capture.bothCaptured");
    if (!ticket.kind) return t("weigh.capture.awaitingSave");
    if (ticket.kind === "Gross") return t("weigh.capture.gross");
    return t("weigh.capture.tare");
};

// Same gating as captureLabel above, for the button's caption line.
export const captureHint = (
    ticket: UseWeighingTicket,
    armed: boolean,
    t: (key: string) => string,
): string => {
    if (ticket.isComplete) return t("weigh.capture.saveToFinish");
    if (!ticket.kind) return t("weigh.capture.awaitingSaveHint");
    return armed ? t("weigh.capture.stableNow") : t("weigh.capture.waitingForStable");
};
