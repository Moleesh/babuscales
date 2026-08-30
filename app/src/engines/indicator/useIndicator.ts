import { useIndicatorSource } from "./_private/IndicatorContext";
import type { IndicatorSource } from "./types";

/** The source instance itself — for calling adapter-specific controls like `loadLorry`/`reset`. */
export const useIndicator = (): IndicatorSource => useIndicatorSource();
