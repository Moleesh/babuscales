import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import styles from "./Field.module.css";
import { FieldGrid } from "./FieldGrid";
import { cssClass } from "../../testUtils";

describe("FieldGrid", () => {
    it("renders its children", () => {
        render(
            <FieldGrid>
                <span>Only field</span>
            </FieldGrid>,
        );
        expect(screen.getByText("Only field")).toBeInTheDocument();
    });

    it("defaults to the 1-column class when columns isn't given", () => {
        const { container } = render(
            <FieldGrid>
                <span>Field</span>
            </FieldGrid>,
        );
        expect(container.firstChild).toHaveClass(cssClass(styles.grid1));
    });

    it.each([1, 2, 3, 4] as const)("applies the grid%s class when columns=%s", (columns) => {
        const { container } = render(
            <FieldGrid columns={columns}>
                <span>Field</span>
            </FieldGrid>,
        );
        expect(container.firstChild).toHaveClass(cssClass(styles[`grid${columns}`]));
    });
});
