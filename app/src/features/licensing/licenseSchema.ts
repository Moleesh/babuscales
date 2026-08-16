import { z } from "zod";

// One row, ConfigId "license", ConfigKind: "License" (db/types.ts's
// CONFIG_KINDS) — same "everything saved in the DB" shape as
// SettingsProvider's own config row (settingsSchema.ts's SETTINGS_CONFIG_ID),
// not a local file. `TrialStartedOn` is seeded once, on first run, and never
// rewritten after that (resetting it by editing the DB directly is exactly
// as far outside this app's threat model as editing `settings` rows
// directly already is — see adminAuth.ts's own comment on that). `days_left`
// is nonetheless quantized to whole days ("trial with expiry"),
// so a reinstall a few hours later doesn't silently buy back a day.
export const LICENSE_CONFIG_ID = "license";

export const licenseBodySchema = z.object({
    /** ISO date (yyyy-MM-dd) the trial clock started — set once, on first run. */
    TrialStartedOn: z.string(),
    /** The ~124-char base32 code from `licensegen sign` (tools/licensegen), or null before one's ever been pasted in. */
    ActivationCode: z.string().nullable(),
});
export type LicenseBody = z.infer<typeof licenseBodySchema>;
