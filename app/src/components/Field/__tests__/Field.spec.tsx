import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithI18n } from "../../../testUtils";
import { Field } from "../Field";

describe("Field", () => {
    it("renders a label wired to its input via htmlFor/id", () => {
        renderWithI18n(
            <Field id="mfName" label={{ en: "Name" }}>
                <input id="mfName" />
            </Field>,
        );
        expect(screen.getByLabelText("Name")).toBeInTheDocument();
    });

    // Field's search glass now uses the themed Tooltip component instead of
    // a native `title` attribute (Tooltip.tsx) — the bubble only mounts
    // once hovered/focused, so this hovers the glass first.
    it("shows the search glass with searchTitle as its tooltip when given", () => {
        renderWithI18n(
            <Field id="party" label={{ en: "Party" }} searchTitle={{ en: "Search parties" }}>
                <input id="party" />
            </Field>,
        );
        fireEvent.mouseEnter(screen.getByText("⌕").parentElement as HTMLElement);
        expect(screen.getByRole("tooltip")).toHaveTextContent("Search parties");
    });

    it('shows a "Recalled" badge only when recalled is true', () => {
        const { rerender } = renderWithI18n(
            <Field id="veh" label={{ en: "Vehicle" }}>
                <input id="veh" />
            </Field>,
        );
        expect(screen.queryByText("Recalled")).toBeNull();

        rerender(
            <Field id="veh" label={{ en: "Vehicle" }} recalled>
                <input id="veh" />
            </Field>,
        );
        expect(screen.getByText("Recalled")).toBeInTheDocument();
    });
});
