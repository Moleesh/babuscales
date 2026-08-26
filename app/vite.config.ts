import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
// vitest/config re-exports Vite's defineConfig with an extra `test` key —
// one config file for both, no duplicated aliases (task #61).
import { defineConfig } from "vitest/config";

// The GitHub Pages build serves from /babuscales/; the Tauri build and local
// dev both serve from /. Only VITE_BASE changes between them — see
// PLAN §20.2 and app/README.md.
const alias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    base: process.env.VITE_BASE ?? "/",
    plugins: [react()],
    css: {
        // NOTE: deliberately NOT `transformer: "lightningcss"` here — Vite's
        // `modules.localsConvention` (below) is only honored by the default
        // postcss pipeline. Under the lightningcss transformer, Vite hands
        // CSS Modules off to Lightning CSS's own module system instead,
        // which has no case-convention concept at all: `.cap-bar` would
        // export as `styles["cap-bar"]`, not `styles.capBar`, silently
        // breaking every existing `styles.xxx` call site (confirmed by a
        // failing WeightDisplay test during this migration — verify before
        // re-enabling if this is revisited).
        modules: {
            // CSS class selectors are kebab-case (`.form-actions`) — the
            // idiomatic CSS spelling. This converts them to a camelCase-only
            // JS export (`styles.formActions`), so every `styles.xxx` call
            // site in TSX is unaffected by the kebab-case rename.
            localsConvention: "camelCaseOnly",
        },
    },
    resolve: {
        alias: {
            "@components": alias("./src/components"),
            "@engines": alias("./src/engines"),
            "@features": alias("./src/features"),
            "@db": alias("./src/db"),
            "@i18n": alias("./src/i18n"),
            "@styles": alias("./src/styles"),
            "@constants": alias("./src/constants"),
            "@hooks": alias("./src/hooks"),
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
        // Lightning CSS still earns its keep here: minification runs after
        // CSS Modules class names are already resolved to JS, so it can't
        // touch `localsConvention` — this is the safe half of the tool.
        cssMinify: "lightningcss",
    },
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./src/testSetup.ts"],
        css: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts", "src/**/*.spec.{ts,tsx}", "src/testSetup.ts"],
        },
    },
});
