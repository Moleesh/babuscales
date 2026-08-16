/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** "memory" (default) or "tauri" — see src/db/createDataPort.ts. */
    readonly VITE_DATA_ADAPTER?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
