import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The GitHub Pages build serves from /babuscales/; the Tauri build and local
// dev both serve from /. Only VITE_BASE changes between them — see
// PLAN §20.2 and app/README.md.
const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    base: process.env.VITE_BASE ?? "/",
    plugins: [react()],
    resolve: {
        alias: {
            "@components": alias("./src/components"),
            "@engines": alias("./src/engines"),
            "@features": alias("./src/features"),
            "@db": alias("./src/db"),
            "@i18n": alias("./src/i18n"),
            "@styles": alias("./src/styles"),
            "@constants": alias("./src/constants"),
        },
    },
    // Tauri expects a fixed dev-server port and a predictable dist/ output.
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
});
