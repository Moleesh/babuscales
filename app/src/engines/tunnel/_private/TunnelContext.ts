import { createContext } from "react";

import type { TunnelSource } from "../types";

export const TunnelContext = createContext<TunnelSource | null>(null);
