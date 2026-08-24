import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { SearchableDropdownOption } from "../SearchableDropdown.types";

interface UseDropdownStateArgs {
    value: string;
    onChange: (text: string) => void;
    onSearch: (query: string) => SearchableDropdownOption[];
    onPick?: (option: SearchableDropdownOption) => void;
    onAddNew?: (query: string) => void;
}

interface KeyDownContext {
    open: boolean;
    rowCount: number;
    highlightedIndex: number;
    results: SearchableDropdownOption[];
    value: string;
    setOpen: (open: boolean) => void;
    moveHighlight: (delta: 1 | -1) => void;
    pick: (option: SearchableDropdownOption) => void;
    addNew?: (query: string) => void;
    close: () => void;
}

// The input's ArrowUp/ArrowDown/Enter/Escape handling, pulled out of the
// hook below purely to keep that function under the 60-line budget
// (docs/CodingStandards.md §1) — this is still the field's keyboard wiring,
// just named separately.
const handleDropdownKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>, ctx: KeyDownContext) => {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!ctx.open) ctx.setOpen(true);
        else ctx.moveHighlight(1);
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        ctx.moveHighlight(-1);
    } else if (event.key === "Enter") {
        if (ctx.highlightedIndex < 0 || !ctx.open) return;
        event.preventDefault();
        const option = ctx.results[ctx.highlightedIndex];
        if (option) ctx.pick(option);
        else ctx.addNew?.(ctx.value);
    } else if (event.key === "Escape") {
        ctx.close();
    }
};

// All of the field's open/highlight state plus its keyboard and mouse
// wiring, pulled out of the component so `SearchableDropdown.tsx` reads as
// markup rather than a state machine (docs/CodingStandards.md §1 — function
// length is the readability signal that matters).
export const useDropdownState = ({ value, onChange, onSearch, onPick, onAddNew }: UseDropdownStateArgs) => {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    // Handed to SearchableDropdown.tsx's own `.wrapper` div (input + popover
    // together) — lets the scroll-close effect below tell the popover's own
    // internal scroll apart from a scroll elsewhere on the page.
    const wrapperRef = useRef<HTMLDivElement>(null);
    const results = open ? onSearch(value) : [];
    const showAddNew = Boolean(
        open && onAddNew && value.trim() && !results.some((r) => r.Label === value),
    );
    // The combined, keyboard-navigable list: search results, then the
    // optional "＋ Add" row.
    const rowCount = results.length + (showAddNew ? 1 : 0);

    const close = () => {
        setOpen(false);
        setHighlightedIndex(-1);
    };

    // Task: "on scroll close all the dropdowns, date drop down and other
    // custom dropdowns" — same reasoning as Select.tsx's/DatePicker.tsx's
    // own `useCloseOnOutsideClick`: the open popover is absolutely
    // positioned off the input's rect and doesn't track it during a scroll.
    // `.pop`'s own `overflow: auto` (SearchableDropdown.module.css) means a
    // long result list's internal scroll fires here too — the `contains`
    // guard below skips those so scrolling through results doesn't close
    // the very popover being scrolled.
    useEffect(() => {
        if (!open) return;
        const onScroll = (event: Event) => {
            if (wrapperRef.current && event.target instanceof Node && wrapperRef.current.contains(event.target)) {
                return;
            }
            close();
        };
        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => document.removeEventListener("scroll", onScroll, { capture: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const pick = (option: SearchableDropdownOption) => {
        onChange(option.Label);
        onPick?.(option);
        close();
    };

    const addNew = onAddNew
        ? (query: string) => {
              onAddNew(query);
              close();
          }
        : undefined;

    const moveHighlight = (delta: 1 | -1) => {
        if (rowCount === 0) return;
        setHighlightedIndex((i) => {
            // No row highlighted yet: ArrowDown starts at the first row,
            // ArrowUp wraps straight to the last one.
            const from = i < 0 ? (delta === 1 ? -1 : 0) : i;
            return (from + delta + rowCount) % rowCount;
        });
    };

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) =>
        handleDropdownKeyDown(event, {
            open,
            rowCount,
            highlightedIndex,
            results,
            value,
            setOpen,
            moveHighlight,
            pick,
            addNew,
            close,
        });

    const handleInputChange = (text: string) => {
        onChange(text);
        setHighlightedIndex(-1);
    };

    return {
        open,
        setOpen,
        highlightedIndex,
        results,
        showAddNew,
        pick,
        addNew,
        handleKeyDown,
        handleInputChange,
        wrapperRef,
    };
};
