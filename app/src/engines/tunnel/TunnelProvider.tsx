import type { ReactNode } from "react";

import { TunnelContext } from "./_private/TunnelContext";
import type { TunnelSource } from "./types";

export interface TunnelProviderProps {
    source: TunnelSource;
    children: ReactNode;
}

// One instance for the whole app — same shape as VerificationServerProvider/IndicatorProvider.
export const TunnelProvider = ({ source, children }: TunnelProviderProps) => (
    <TunnelContext.Provider value={source}>{children}</TunnelContext.Provider>
);
