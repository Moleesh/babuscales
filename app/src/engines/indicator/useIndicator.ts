import { useContext } from "react";

import { IndicatorContext } from "./_private/IndicatorContext";
import type { IndicatorSource } from "./types";

/** The source instance itself — for calling adapter-specific controls like `loadLorry`/`reset`. */
export const useIndicator = (): IndicatorSource => {
    const source = useContext(IndicatorContext);
    if (!source) throw new Error("useIndicator must be used within an IndicatorProvider");
    return source;
};
