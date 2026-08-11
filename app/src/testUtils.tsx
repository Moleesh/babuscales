import { render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { I18nProvider } from "@i18n/I18nProvider";

// Shared test helper (task #61) — most components read the active
// language through I18nContext (useTranslation), so plain render() throws
// "useTranslation must be used within an I18nProvider". Wraps in an empty
// pack list, which I18nProvider itself falls back to English for. Uses
// RTL's `wrapper` option (rather than wrapping `ui` by hand) so the
// returned `rerender()` re-applies the same provider instead of replacing
// it — a hand-wrapped `rerender(ui)` would unmount the provider entirely.
// The wrapper is inlined (not a module-scope component) so this file stays
// eligible for `react-refresh/only-export-components` alongside `cssClass`.
export const renderWithI18n = (ui: ReactElement): RenderResult =>
    render(ui, { wrapper: ({ children }) => <I18nProvider packs={[]}>{children}</I18nProvider> });

// CSSModuleClasses (vite/client.d.ts) is an index signature, and this repo's
// tsconfig turns on `noUncheckedIndexedAccess`, so `styles.someClass` types
// as `string | undefined` even though it's always present at runtime. Tests
// asserting `toHaveClass(styles.someClass)` need a real `string` — this
// narrows it, throwing loudly (not silently passing `undefined`) if a class
// is ever renamed out from under a test.
export const cssClass = (value: string | undefined): string => {
    if (!value) throw new Error("Expected CSS module to export this class, but it was undefined.");
    return value;
};
