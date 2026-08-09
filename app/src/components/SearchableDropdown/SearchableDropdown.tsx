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
    const showAddNew = open && onAddNew && value.trim() && !results.some((r) => r.Label === value);

    const pick = (option: SearchableDropdownOption) => {
        onChange(option.Label);
        onPick?.(option);
        setOpen(false);
    };

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
                            onClick={() => pick(option)}
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
                            onClick={() => {
                                onAddNew(value);
                                setOpen(false);
                            }}
                        >
                            {addNewLabel ? addNewLabel(value) : `＋ Add "${value}"`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
