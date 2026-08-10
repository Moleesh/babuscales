import type { LicensingSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no machine identity or
// private key to bind a licence to in a browser tab, and the public demo
// must always run fully unlocked regardless — same "honestly report
// nothing here" shape as @engines/tunnel's noop source, except `evaluate`
// reports `null` rather than a `TrialExpired`-shaped lie.
export const createNoopLicensing = (): LicensingSource => ({
    requestCode: () => Promise.resolve(null),
    evaluate: () => Promise.resolve(null),
});
