import { invoke } from "@tauri-apps/api/core";
import type { LicensingSource, LicenseState } from "./types";

export const createTauriLicensing = (): LicensingSource => ({
    requestCode: () => invoke<string>("license_request_code"),
    evaluate: (trialStartedOn, activationCode) =>
        invoke<LicenseState>("evaluate_license", {
            trialStartedOn,
            activationCode,
        }),
});
