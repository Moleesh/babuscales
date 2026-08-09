import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

// docs/CodingStandards.md §0 draws one line: correctness and security block,
// everything else is auto-fixed or advisory. The split below is literal —
// each blocking rule is named in that doc's table; nothing else is "error".
const BLOCKING_RULES = {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "import/no-cycle": "error",
    // An empty catch is how a failed print or a dropped capture becomes
    // invisible (§9) — the one style-adjacent rule that blocks.
    "no-empty": ["error", { allowEmptyCatch: false }],
};

// Advisory: reported, never blocks (§1.1, §4 "Conventions — warned, not
// blocked"). `--max-warnings` is deliberately NOT set on the `lint` script
// for this reason — only `lint:errors` (eslint --quiet) gates CI.
const ADVISORY_RULES = {
    "@typescript-eslint/consistent-type-imports": "warn",
    "import/no-default-export": "warn",
    "import/no-namespace": "warn",
    "max-lines-per-function": ["warn", { max: 60, skipComments: true, skipBlankLines: true }],
    "max-depth": ["warn", 4],
    "max-params": ["warn", 4],
    "sonarjs/cognitive-complexity": ["warn", 15],
    "import/order": [
        "warn",
        {
            groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
            pathGroups: [
                {
                    pattern: "@(components|engines|features|db|i18n|styles|constants)/**",
                    group: "internal",
                },
            ],
            "newlines-between": "always",
            alphabetize: { order: "asc", caseInsensitive: true },
        },
    ],
    // Vite's HMR entry and the router file are the sanctioned default
    // exports; everything else names its export.
    "no-restricted-syntax": [
        "warn",
        {
            selector: "TSEnumDeclaration",
            message: "Use a union of string literals or `as const` object instead of enum.",
        },
    ],
};

export default tseslint.config(
    { ignores: ["dist", "src-tauri/target", "node_modules"] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
            import: importPlugin,
            sonarjs,
        },
        settings: {
            "import/resolver": {
                typescript: { project: ["./tsconfig.app.json", "./tsconfig.node.json"] },
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            ...BLOCKING_RULES,
            ...ADVISORY_RULES,
        },
    },
    {
        files: ["src/main.tsx", "**/*.config.ts"],
        rules: { "import/no-default-export": "off" },
    },
    {
        // The flat config itself and the standalone report scripts: plain
        // Node/ESM tooling, not app code — not part of either tsconfig
        // project, so they opt out of type-aware rules and need Node's
        // globals declared explicitly instead of the browser's.
        files: ["eslint.config.js", "scripts/**/*.mjs"],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: { globals: globals.node },
        rules: { "import/no-default-export": "off" },
    },
);
