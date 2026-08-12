import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "../Card";

describe("Card", () => {
    it("renders its children in the body", () => {
        render(<Card>Hello</Card>);
        expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("renders a header with title and headerRight when given", () => {
        const { container } = render(
            <Card title="Reports" headerRight={<span>3 waiting</span>}>
                Body
            </Card>,
        );
        expect(screen.getByText("Reports")).toBeInTheDocument();
        expect(screen.getByText("3 waiting")).toBeInTheDocument();
        expect(container.querySelector("header")).not.toBeNull();
    });

    it("omits the header entirely when neither title nor headerRight is given", () => {
        const { container } = render(<Card>Body only</Card>);
        expect(container.querySelector("header")).toBeNull();
    });
});
