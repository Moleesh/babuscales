import type { ReactNode } from "react";

import { VerificationServerContext } from "./_private/VerificationServerContext";
import type { VerificationServerSource } from "./types";

export interface VerificationServerProviderProps {
    source: VerificationServerSource;
    children: ReactNode;
}

// One instance for the whole app — same shape as IndicatorProvider/DataPortProvider.
export const VerificationServerProvider = ({
    source,
    children,
}: VerificationServerProviderProps) => (
    <VerificationServerContext.Provider value={source}>
        {children}
    </VerificationServerContext.Provider>
);
