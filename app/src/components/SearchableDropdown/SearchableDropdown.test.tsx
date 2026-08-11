import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchableDropdown } from "./SearchableDropdown";
import type { SearchableDropdownOption } from "./SearchableDropdown";

const OPTIONS: SearchableDropdownOption[] = [
    { Value: "p1", Label: "Ganesh Traders", Sub: "Nagercoil" },
    { Value: "p2", Label: "Ganesh Metals" },
];

// Split into two `describe` blocks (over the 60-line function budget as one —
// docs/CodingStandards.md): typing/value behaviour vs. the results popover.
describe("SearchableDropdown — input value", () => {
    it("renders the current value in the input", () => {
        render(
            <SearchableDropdown value="Ganesh" onChange={vi.fn()} onSearch={() => OPTIONS} />,
        );
        expect(screen.getByRole("combobox")).toHaveValue("Ganesh");
    });

    it("calls onChange as the user types", () => {
        const onChange = vi.fn();
        render(<SearchableDropdown value="" onChange={onChange} onSearch={() => OPTIONS} />);
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "Gan" } });
        expect(onChange).toHaveBeenCalledWith("Gan");
    });
});

describe("SearchableDropdown — results popover", () => {
    it("opens the results popover on focus and lists onSearch's matches", () => {
        render(
            <SearchableDropdown value="Ganesh" onChange={vi.fn()} onSearch={() => OPTIONS} />,
        );
        expect(screen.queryByRole("listbox")).toBeNull();
        fireEvent.focus(screen.getByRole("combobox"));
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getByText("Ganesh Traders")).toBeInTheDocument();
        expect(screen.getByText("Nagercoil")).toBeInTheDocument();
        expect(screen.getByText("Ganesh Metals")).toBeInTheDocument();
    });

    it("calls onPick with the chosen option and closes the popover", () => {
        const onPick = vi.fn();
        render(
            <SearchableDropdown value="Ganesh" onChange={vi.fn()} onSearch={() => OPTIONS} onPick={onPick} />,
        );
        fireEvent.focus(screen.getByRole("combobox"));
        fireEvent.click(screen.getByText("Ganesh Traders"));
        expect(onPick).toHaveBeenCalledWith(OPTIONS[0]);
        expect(screen.queryByRole("listbox")).toBeNull();
    });

    it('shows an "add new" row when nothing matches exactly, and calls onAddNew', () => {
        const onAddNew = vi.fn();
        render(
            <SearchableDropdown
                value="New Party"
                onChange={vi.fn()}
                onSearch={() => []}
                onAddNew={onAddNew}
                addNewLabel={(q) => `Add "${q}"`}
            />,
        );
        fireEvent.focus(screen.getByRole("combobox"));
        const addButton = screen.getByRole("button", { name: 'Add "New Party"' });
        fireEvent.click(addButton);
        expect(onAddNew).toHaveBeenCalledWith("New Party");
    });

    it("does not show the add-new row when the query exactly matches an existing option", () => {
        render(
            <SearchableDropdown
                value="Ganesh Traders"
                onChange={vi.fn()}
                onSearch={() => OPTIONS}
                onAddNew={vi.fn()}
            />,
        );
        fireEvent.focus(screen.getByRole("combobox"));
        expect(screen.queryByText(/＋ Add/)).toBeNull();
    });
});
