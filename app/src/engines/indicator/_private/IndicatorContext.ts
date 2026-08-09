import { createContext } from "react";

import type { IndicatorSource } from "../types";

export const IndicatorContext = createContext<IndicatorSource | null>(null);
