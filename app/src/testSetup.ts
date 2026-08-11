import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// Vitest setup file (task #61) — registers jest-dom's matchers
// (toBeInTheDocument, toHaveTextContent, etc.) once for every test file,
// per vitest.config.ts's `test.setupFiles`. vitest.config.ts sets
// `globals: false` (explicit `import { describe, it, expect } from
// "vitest"` everywhere, no ambient test globals), so React Testing
// Library's own auto-cleanup — which only registers when it finds a
// global `afterEach` — never fires on its own; wire it up by hand so
// each test unmounts into a clean document.
afterEach(cleanup);
