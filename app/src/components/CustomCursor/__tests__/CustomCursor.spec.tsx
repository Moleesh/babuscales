import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomCursor } from "../CustomCursor";

const mockMatchMedia = (reduceMotion: boolean) =>
    vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion") ? reduceMotion : true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    }));

describe("CustomCursor", () => {
    afterEach(() => {
        document.body.classList.remove("custom-cursor-active");
    });

    it("renders nothing and leaves the native cursor alone under prefers-reduced-motion", () => {
        window.matchMedia = mockMatchMedia(true);
        const { container } = render(<CustomCursor />);
        expect(container).toBeEmptyDOMElement();
        expect(document.body.classList.contains("custom-cursor-active")).toBe(false);
    });

    it("renders the follower and marks the body active when motion is allowed", () => {
        window.matchMedia = mockMatchMedia(false);
        const { container } = render(<CustomCursor />);
        expect(container.firstChild).not.toBeNull();
        expect(document.body.classList.contains("custom-cursor-active")).toBe(true);
    });
});
