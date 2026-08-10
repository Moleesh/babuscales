import type { LicenseState } from "@engines/licensing";

// Shared by LicenseProvider (the flash message after `activate()`) and
// Settings' System pane (the card's own status line) — one place for the
// wording so the two never drift, and a leaf module (only depends on
// `@engines/licensing`'s types) so SystemPane can import it without pulling
// in LicenseProvider's own `useSettings` dependency — see SystemPane's
// import comment for why that split matters.
export const describeLicenseState = (state: LicenseState): string => {
    switch (state.Kind) {
        case "Trial":
            return `Trial — ${state.days_left} day${state.days_left === 1 ? "" : "s"} left.`;
        case "TrialExpired":
            return "Trial expired.";
        case "Licensed":
            return state.expires_on ? `Licensed — valid until ${state.expires_on}.` : "Licensed.";
        case "Expired":
            return `Licence expired on ${state.expired_on}.`;
        case "Invalid":
            return state.reason;
    }
};
