import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppModal } from "./AppModal";
import styles from "./AppModal.module.css";
import { cssClass } from "../../testUtils";

describe("AppModal", () => {
    it("renders nothing when closed", () => {
        const { container } = render(
            <AppModal open={false} title="Confirm" onClose={vi.fn()}>
                Body
            </AppModal>,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the title and children when open", () => {
        render(
            <AppModal open title="Confirm" onClose={vi.fn()}>
                <p>Are you sure?</p>
            </AppModal>,
        );
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Confirm")).toBeInTheDocument();
        expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", () => {
        const onClose = vi.fn();
        render(
            <AppModal open title="Confirm" onClose={onClose}>
                Body
            </AppModal>,
        );
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when the backdrop itself is clicked, not when the sheet is", () => {
        const onClose = vi.fn();
        render(
            <AppModal open title="Confirm" onClose={onClose}>
                Body
            </AppModal>,
        );
        fireEvent.click(screen.getByText("Body"));
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose on Escape", () => {
        const onClose = vi.fn();
        render(
            <AppModal open title="Confirm" onClose={onClose}>
                Body
            </AppModal>,
        );
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("applies the small sheet class only when size is small", () => {
        render(
            <AppModal open title="Confirm" onClose={vi.fn()} size="small">
                Body
            </AppModal>,
        );
        expect(screen.getByRole("dialog")).toHaveClass(cssClass(styles.small));
    });
});
