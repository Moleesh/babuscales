import type { ReactNode } from "react";

import type { LicenseState } from "@engines/licensing";

// AppShell's `banner` slot (App.tsx wires this in above every screen) — a
// heads-up while the trial is running low, or the hard stop once it's
// actually run out. `null` for Trial (>3 days left), Licensed, still
// loading, or the noop engine (web demo) — a plain function rather than a
// component so the caller (App.tsx's Shell) can tell up front whether
// there's anything to show, instead of AppShell always paying for a
// bordered wrapper div around content that turns out to be nothing (see
// useLicense's own "null means don't gate" comment for why `state === null`
// falls through here too).
export const renderLicenseBanner = (state: LicenseState | null, isGated: boolean): ReactNode => {
    if (!state) return null;

    if (isGated) {
        // A switch (not another ternary chain) so TS actually narrows
        // `state.reason` in the Invalid arm — Trial/Licensed can't reach
        // here in practice (isGated excludes them), but the type doesn't
        // know that since `isGated` is a plain boolean, not something
        // derived by narrowing `state` itself.
        const reason = ((): string => {
            switch (state.Kind) {
                case "TrialExpired":
                    return "Your 14-day trial has ended.";
                case "Expired":
                    return `Your licence expired on ${state.expired_on}.`;
                case "Invalid":
                    return state.reason;
                case "Trial":
                case "Licensed":
                    // Unreachable in practice (isGated excludes both) —
                    // kept exhaustive for the linter rather than a `default`.
                    return "Your licence needs attention.";
            }
        })();
        return (
            <>
                <span>🔒</span>
                <span>
                    {reason} New tickets can&apos;t be saved until it&apos;s activated — enter a
                    code in Settings → System.
                </span>
            </>
        );
    }

    if (state.Kind === "Trial" && state.days_left <= 3) {
        return (
            <span>
                ⏳ Trial — {state.days_left} day{state.days_left === 1 ? "" : "s"} left. Activate
                any time from Settings → System.
            </span>
        );
    }

    return null;
};
