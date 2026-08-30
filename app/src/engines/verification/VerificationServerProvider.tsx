import type { ReactElement, ReactNode } from "react";

import { VerificationServerContextProvider } from "./_private/VerificationServerContext";
import type { VerificationServerSource } from "./types";

export interface VerificationServerProviderProps {
    source: VerificationServerSource;
    children: ReactNode;
}

// One instance for the whole app — same shape as IndicatorProvider/DataPortProvider.
export const VerificationServerProvider = ({
    source,
    children,
}: VerificationServerProviderProps): ReactElement => (
    <VerificationServerContextProvider source={source}>{children}</VerificationServerContextProvider>
);
