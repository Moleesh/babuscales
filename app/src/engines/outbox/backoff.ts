import type { OutboxPatch } from "@db/types";

// Outbox-worker task — a failed send used to leave `State: "Failed"` as a
// dead end forever (the "drain of one" call sites in
// @features/weighing/_private/useTicketDelivery.ts and App.tsx's
// DailySummarySync had no worker to hand a retry to). Shared by those same
// call sites and @features/settings' useOutboxWorker now: on failure, both
// set `NextTryAt` using this schedule instead, and the worker is what
// actually wakes a `Failed` row back up once its time has passed. Lives
// here (not under either feature's own `_private/`) precisely because both
// a weighing-feature call site and a settings-feature worker need it —
// `engines/` is the shared, feature-agnostic layer every feature already
// depends downward into, never the other way around.
//
// Four steps, then gives up — `attempts` is the row's `Attempts` value
// *before* this failed send (0 on a first failure): 0 -> 30s, 1 -> 2min,
// 2 -> 10min, 3 -> 1hr, capped there. `attempts >= 4` means every step's
// been used up; the caller stops asking for another `NextTryAt` at that
// point and leaves the row `Failed` with `NextTryAt: null` — "permanently
// failed, needs a human" (no alert/notification system exists to invent one
// for here).
const BACKOFF_STEPS_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000] as const;

export const MAX_OUTBOX_ATTEMPTS = BACKOFF_STEPS_MS.length;

/** `null` once `attempts` has exhausted every step — the "give up" signal callers check before writing `NextTryAt`. */
export const nextBackoffDelayMs = (attempts: number): number | null => {
    if (attempts < 0 || attempts >= BACKOFF_STEPS_MS.length) return null;
    return BACKOFF_STEPS_MS[attempts] ?? null;
};

/** The one thing every "drain of one" call site (sendTicketEmail/sendTicketSms/DailySummarySync) and useOutboxWorker.ts all do once a send settles — never throws, so this takes the same `{ Ok: boolean }` shape every `*Source.send` result already carries. `attemptsBefore` is the row's `Attempts` value going into this attempt. `now` is the caller's `Date.now()` — injected rather than read here (docs/CodingStandards.md §2), so the backoff schedule stays testable without mocking global time. */
export const reconcileOutboxOutcome = (
    result: { Ok: boolean },
    attemptsBefore: number,
    now: number,
): OutboxPatch => {
    const attempts = attemptsBefore + 1;
    if (result.Ok) return { State: "Sent", Attempts: attempts, NextTryAt: null };
    const delayMs = attemptsBefore < MAX_OUTBOX_ATTEMPTS ? nextBackoffDelayMs(attemptsBefore) : null;
    const nextTryAt = delayMs === null ? null : new Date(now + delayMs).toISOString();
    return { State: "Failed", Attempts: attempts, NextTryAt: nextTryAt };
};
