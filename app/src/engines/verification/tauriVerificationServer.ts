import { invoke } from "@tauri-apps/api/core";

import type { VerificationServerSource, VerificationServerStatus } from "./types";

// Only ever imported from createVerificationServerSource.ts's guarded
// branch — see that file's own comment for why (same tree-shaking
// guarantee as @engines/indicator/serialIndicator.ts).
export const createTauriVerificationServer = (): VerificationServerSource => ({
    start: () => invoke<VerificationServerStatus>("start_verification_server"),
    stop: () => invoke<void>("stop_verification_server"),
    status: () => invoke<VerificationServerStatus | null>("verification_server_status"),
});
