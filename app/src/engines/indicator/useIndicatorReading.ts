import { useSyncExternalStore } from "react";

import type { IndicatorReading } from "./types";
import { useIndicator } from "./useIndicator";

// The reading ticks every 70ms outside React's render cycle — exactly what
// useSyncExternalStore is for, so WeightDisplay re-renders on each tick
// without the rest of the tree (or a poller) needing to know that.
export const useIndicatorReading = (): IndicatorReading => {
    const source = useIndicator();
    return useSyncExternalStore(source.subscribe, source.getReading);
};
