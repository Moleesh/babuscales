import { useTunnelSource } from "./_private/TunnelContext";
import type { TunnelSource } from "./types";

export const useTunnel = (): TunnelSource => useTunnelSource();
