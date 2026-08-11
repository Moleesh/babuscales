import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
    it("renders its children as the label", () => {
        render(<Button>Capture Tare</Button>);
        expect(screen.getByRole("button", { name: "Capture Tare" })).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Save</Button>);
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", () => {
        const onClick = vi.fn();
        render(
            <Button onClick={onClick} disabled>
                Save
            </Button>,
        );
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        expect(onClick).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("renders an optional caption line under the label", () => {
        render(<Button caption="Waiting for a stable reading">Capture Tare</Button>);
        expect(screen.getByText("Waiting for a stable reading")).toBeInTheDocument();
    });

    it("omits the caption element entirely when none is given", () => {
        const { container } = render(<Button>Capture Tare</Button>);
        expect(container.querySelector("small")).toBeNull();
    });

    it("forwards native button attributes such as type and aria-label", () => {
        render(
            <Button type="submit" aria-label="Submit form">
                Go
            </Button>,
        );
        const button = screen.getByRole("button", { name: "Submit form" });
        expect(button).toHaveAttribute("type", "submit");
    });
});
