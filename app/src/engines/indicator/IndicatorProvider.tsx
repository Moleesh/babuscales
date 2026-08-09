import type { ReactNode } from "react";

import { IndicatorContext } from "./_private/IndicatorContext";
import type { IndicatorSource } from "./types";

export interface IndicatorProviderProps {
    source: IndicatorSource;
    children: ReactNode;
}

// One instance for the whole app, same shape as DataPortProvider — created
// once by whatever picks the adapter (simulated today, serial later) and
// handed down, never re-created per screen.
export const IndicatorProvider = ({ source, children }: IndicatorProviderProps) => (
    <IndicatorContext.Provider value={source}>{children}</IndicatorContext.Provider>
);
