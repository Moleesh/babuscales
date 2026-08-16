import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// Vitest setup file — registers jest-dom's matchers
// (toBeInTheDocument, toHaveTextContent, etc.) once for every test file,
// per vitest.config.ts's `test.setupFiles`. vitest.config.ts sets
// `globals: false` (explicit `import { describe, it, expect } from
// "vitest"` everywhere, no ambient test globals), so React Testing
// Library's own auto-cleanup — which only registers when it finds a
// global `afterEach` — never fires on its own; wire it up by hand so
// each test unmounts into a clean document.
afterEach(cleanup);

// jsdom doesn't implement ResizeObserver — ScrollArea's useCustomScrollbar
// (app/src/components/ScrollArea/_private/useCustomScrollbar.ts) uses one
// to re-measure the thumb on layout changes, which every AppShell/DataTable
// render now goes through. A minimal stub (no-op observe/unobserve/
// disconnect) is enough: these tests assert on rendered markup and
// behaviour, not on the custom scrollbar thumb's own live sizing.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver ??= ResizeObserverStub;
