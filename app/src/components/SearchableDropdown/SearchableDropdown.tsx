import { useState } from "react";
import type { InputHTMLAttributes } from "react";

import styles from "./SearchableDropdown.module.css";

export interface SearchableDropdownOption {
    Value: string;
    Label: string;
    Sub?: string;
}

export interface SearchableDropdownProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "className"
> {
    value: string;
    onChange: (text: string) => void;
    onSearch: (query: string) => SearchableDropdownOption[];
    onPick?: (option: SearchableDropdownOption) => void;
    onAddNew?: (query: string) => void;
    addNewLabel?: (query: string) => string;
    heading?: string;
}

interface DropdownResultsProps {
    heading?: string;
    results: SearchableDropdownOption[];
    onPick: (option: SearchableDropdownOption) => void;
    query: string;
    onAddNew?: (query: string) => void;
    addNewLabel?: (query: string) => string;
    showAddNew: boolean | undefined;
}

// The open popover's contents — matched options plus the optional "＋ Add"
// row — pulled out so the field component itself reads as "an input plus a
// popover", not the popover's own markup inline.
const DropdownResults = ({
    heading,
    results,
    onPick,
    query,
    onAddNew,
    addNewLabel,
    showAddNew,
}: DropdownResultsProps) => (
    <div className={styles.pop} role="listbox">
        {heading && <div className={styles.heading}>{heading}</div>}
        {results.map((option) => (
            <button
                key={option.Value}
                type="button"
                className={styles.option}
                /* Reachable by mouse/click, not by Enter-as-Tab's field walk (PLAN §13) —
                   it lives outside the natural tab sequence on purpose (useEnterAsTab.ts). */
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(option)}
            >
                <span>{option.Label}</span>
                {option.Sub && <small className={styles.optionSub}>{option.Sub}</small>}
            </button>
        ))}
        {showAddNew && onAddNew && (
            <button
                type="button"
                className={`${styles.option} ${styles.add}`}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAddNew(query)}
            >
                {addNewLabel ? addNewLabel(query) : `＋ Add "${query}"`}
            </button>
        )}
    </div>
);

// A field that searches master data as you type (PLAN §8.2). One
// component behind every ⌕ field — Vehicle No, Party, Material,
// Transporter — so "search the Masters tab" means the same thing
// everywhere it appears.
export const SearchableDropdown = ({
    value,
    onChange,
    onSearch,
    onPick,
    onAddNew,
    addNewLabel,
    heading,
    ...inputProps
}: SearchableDropdownProps) => {
    const [open, setOpen] = useState(false);
    const results = open ? onSearch(value) : [];
    const showAddNew = Boolean(
        open && onAddNew && value.trim() && !results.some((r) => r.Label === value),
    );

    const pick = (option: SearchableDropdownOption) => {
        onChange(option.Label);
        onPick?.(option);
        setOpen(false);
    };

    const addNew = onAddNew
        ? (query: string) => {
              onAddNew(query);
              setOpen(false);
          }
        : undefined;

    return (
        <div className={styles.wrapper}>
            <input
                {...inputProps}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                role="combobox"
                aria-expanded={open}
            />
            {open && (results.length > 0 || showAddNew) && (
                <DropdownResults
                    heading={heading}
                    results={results}
                    onPick={pick}
                    query={value}
                    onAddNew={addNew}
                    addNewLabel={addNewLabel}
                    showAddNew={showAddNew}
                />
            )}
        </div>
    );
};
