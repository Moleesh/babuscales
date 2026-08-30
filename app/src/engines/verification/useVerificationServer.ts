import { useVerificationServerSource } from "./_private/VerificationServerContext";
import type { VerificationServerSource } from "./types";

export const useVerificationServer = (): VerificationServerSource => useVerificationServerSource();
