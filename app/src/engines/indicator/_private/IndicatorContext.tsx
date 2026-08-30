import { createSourceContext } from "@engines/_shared/createSourceContext";

import type { IndicatorSource } from "../types";

// Provider/useSource pair for the single shared IndicatorSource instance —
// see createSourceContext's own comment for the pattern this replaces.
export const { Provider: IndicatorContextProvider, useSource: useIndicatorSource } =
    createSourceContext<IndicatorSource>("useIndicator must be used within an IndicatorProvider");
