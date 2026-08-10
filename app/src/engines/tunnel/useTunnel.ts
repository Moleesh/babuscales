import { useContext } from "react";

import { TunnelContext } from "./_private/TunnelContext";
import type { TunnelSource } from "./types";

export const useTunnel = (): TunnelSource => {
    const source = useContext(TunnelContext);
    if (!source) throw new Error("useTunnel must be used within a TunnelProvider");
    return source;
};
