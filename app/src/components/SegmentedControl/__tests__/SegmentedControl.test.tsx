import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "../SegmentedControl";
import type { SegmentedOption } from "../SegmentedControl";

type Kind = "tickets" | "summary";

const OPTIONS: SegmentedOption<Kind>[] = [
    { value: "tickets", label: "Tickets" },
    { value: "summary", label: "Summary" },
];

describe("SegmentedControl", () => {
    it("renders one button per option with its label", () => {
        render(<SegmentedControl options={OPTIONS} value="tickets" onChange={vi.fn()} ariaLabel="View" />);
        expect(screen.getByRole("button", { name: "Tickets" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Summary" })).toBeInTheDocument();
    });

    it("marks the active option as aria-pressed", () => {
        render(<SegmentedControl options={OPTIONS} value="summary" onChange={vi.fn()} ariaLabel="View" />);
        expect(screen.getByRole("button", { name: "Tickets" })).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByRole("button", { name: "Summary" })).toHaveAttribute("aria-pressed", "true");
    });

    it("calls onChange with the clicked option's value", () => {
        const onChange = vi.fn();
        render(<SegmentedControl options={OPTIONS} value="tickets" onChange={onChange} ariaLabel="View" />);
        fireEvent.click(screen.getByRole("button", { name: "Summary" }));
        expect(onChange).toHaveBeenCalledWith("summary");
    });

    it("disables an option flagged disabled and doesn't fire onChange for it", () => {
        const onChange = vi.fn();
        const options: SegmentedOption<Kind>[] = [
            { value: "tickets", label: "Tickets" },
            { value: "summary", label: "Summary", disabled: true },
        ];
        render(<SegmentedControl options={options} value="tickets" onChange={onChange} ariaLabel="View" />);
        const summaryButton = screen.getByRole("button", { name: "Summary" });
        expect(summaryButton).toBeDisabled();
        fireEvent.click(summaryButton);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("exposes the group's accessible name via ariaLabel", () => {
        render(<SegmentedControl options={OPTIONS} value="tickets" onChange={vi.fn()} ariaLabel="View" />);
        expect(screen.getByRole("group", { name: "View" })).toBeInTheDocument();
    });
});
