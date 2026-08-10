// PLAN §4.10 "licence with trial and expiry · UID machine binding", §12's
// "recovery procedure tied to the licence", §23 item 4. The actual crypto
// (wire format, Ed25519 verification) lives in Rust
// (src-tauri/src/licensing/mod.rs, backed by the sibling `license-format`
// crate) — desktop-only, same reason @engines/tunnel's connector is: there
// is no machine identity or private key to bind to in a browser tab. This
// module is a thin 1:1 wrapper over the two Tauri commands task #37 adds;
// the config row that persists `TrialStartedOn`/`ActivationCode`, and the
// app-wide read-only gate a lapsed trial should trigger, are task #38's
// "activation UI + trial gating" — not built here.

export interface LicenseTrial {
    Kind: "Trial";
    days_left: number;
}
export interface LicenseTrialExpired {
    Kind: "TrialExpired";
}
export interface LicenseLicensed {
    Kind: "Licensed";
    expires_on: string | null;
}
export interface LicenseExpired {
    Kind: "Expired";
    expired_on: string;
}
export interface LicenseInvalid {
    Kind: "Invalid";
    reason: string;
}

/** Mirrors `licensing::LicenseState` (Rust) field-for-field, including its snake_case payload fields — only the `Kind` tag itself is PascalCase there. */
export type LicenseState =
    LicenseTrial | LicenseTrialExpired | LicenseLicensed | LicenseExpired | LicenseInvalid;

export interface LicensingSource {
    /** The ~15-character code an operator reads or pastes to Babulens — `null` where there's no machine to bind one to (the no-op source). */
    requestCode: () => Promise<string | null>;
    /**
     * `null` means "not applicable in this build — never gate" (the no-op
     * source: the public demo must always run unrestricted, same as it
     * always runs with no database at all). A real result otherwise, given
     * whatever the caller has already read out of the `"license"` config
     * row via the ordinary `DataPort.getConfig`/`saveConfig` — this
     * function does no persistence of its own.
     */
    evaluate: (
        trialStartedOn: string,
        activationCode: string | null,
    ) => Promise<LicenseState | null>;
}
