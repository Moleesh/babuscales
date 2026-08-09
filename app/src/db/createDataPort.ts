import { createMemoryAdapter } from "./adapters/memory";
import type { DataPort } from "./DataPort";

// `VITE_DATA_ADAPTER` is a build-time constant (Vite inlines it), which is
// what lets the Pages workflow (PLAN §20.2) produce a build with no Tauri
// and no SQLite in it at all — the branch not taken is never bundled.
export type DataAdapterKind = "tauri" | "memory";

const readAdapterKind = (): DataAdapterKind => {
    const configured = import.meta.env.VITE_DATA_ADAPTER;
    return configured === "tauri" ? "tauri" : "memory";
};

export const createDataPort = (kind: DataAdapterKind = readAdapterKind()): DataPort => {
    if (kind === "memory") return createMemoryAdapter();
    // Lands with the fixed-schema step (PLAN §21 Phase 1, step 3) — the Rust
    // store and its `invoke()`-backed adapter don't exist yet.
    throw new Error("The Tauri/SQLite adapter is not built yet — see app/README.md step 3.");
};
