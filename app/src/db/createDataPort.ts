import { createMemoryAdapter } from "./adapters/memory";
import { createTauriAdapter } from "./adapters/tauri";
import type { DataPort } from "./DataPort";

// `VITE_DATA_ADAPTER` is a build-time constant (Vite inlines it), which is
// what lets the Pages workflow produce a build with no Tauri
// and no SQLite in it at all — the branch not taken is never bundled.
//
// That guarantee depends on this `if` testing `import.meta.env.…` directly,
// in place, with no helper function or parameter in between: only a literal
// comparison right here is something Rollup can fold and then prove the
// other branch — `createTauriAdapter`, and everything under
// `@tauri-apps/api` with it — is unreachable and drop from the bundle.
// (An earlier version routed this through a separate `readAdapterKind()`
// plus a default parameter; verified by inspecting the actual Pages-config
// build output that shape does NOT tree-shake — Tauri code stayed in.)
//
// The Pages workflow sets this to `memory` explicitly
// (.github/workflows/pages.yml). The desktop build sets it to `tauri`
// (package.json's `dev:tauri`/`build:tauri`, via `cross-env`).
// Memory is the default for anything other than an explicit "tauri" — a
// plain `npm run dev`/`npm run build` with no adapter var set (the common
// case; also how this repo's own browser-preview verification runs) must
// keep working exactly as it did before the Tauri adapter existed.
export const createDataPort = (): DataPort => {
    if (import.meta.env.VITE_DATA_ADAPTER === "tauri") return createTauriAdapter();
    return createMemoryAdapter();
};
