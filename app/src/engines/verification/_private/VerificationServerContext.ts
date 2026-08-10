import { createContext } from "react";

import type { VerificationServerSource } from "../types";

export const VerificationServerContext = createContext<VerificationServerSource | null>(null);
