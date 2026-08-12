import { screen } from "@testing-library/react";
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

    it("shows the search glass with searchTitle as its tooltip when given", () => {
        renderWithI18n(
            <Field id="party" label={{ en: "Party" }} searchTitle={{ en: "Search parties" }}>
                <input id="party" />
            </Field>,
        );
        expect(screen.getByTitle("Search parties")).toBeInTheDocument();
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
