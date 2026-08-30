import { createSourceContext } from "@engines/_shared/createSourceContext";

import type { TunnelSource } from "../types";

// Provider/useSource pair for the single shared TunnelSource instance — see
// createSourceContext's own comment for the pattern this replaces.
export const { Provider: TunnelContextProvider, useSource: useTunnelSource } =
    createSourceContext<TunnelSource>("useTunnel must be used within a TunnelProvider");
