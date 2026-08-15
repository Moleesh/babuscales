import { useDropdownState } from "./_private/useDropdownState";
import styles from "./_styles/SearchableDropdown.module.css";
import type { SearchableDropdownOption, SearchableDropdownProps } from "./SearchableDropdown.types";

export type { SearchableDropdownOption, SearchableDropdownProps } from "./SearchableDropdown.types";

interface DropdownResultsProps {
    heading?: string;
    results: SearchableDropdownOption[];
    onPick: (option: SearchableDropdownOption) => void;
    query: string;
    onAddNew?: (query: string) => void;
    addNewLabel?: (query: string) => string;
    showAddNew: boolean | undefined;
    highlightedIndex: number;
}

// The open popover's contents — matched options plus the optional "＋ Add"
// row — pulled out so the field component itself reads as "an input plus a
// popover", not the popover's own markup inline. `highlightedIndex` indexes
// into results + the trailing add-new row combined, driven by the input's
// ArrowUp/ArrowDown handling in `useDropdownState`.
const DropdownResults = ({
    heading,
    results,
    onPick,
    query,
    onAddNew,
    addNewLabel,
    showAddNew,
    highlightedIndex,
}: DropdownResultsProps) => (
    <div className={styles.pop} role="listbox">
        {heading && <div className={styles.heading}>{heading}</div>}
        {results.map((option, index) => (
            <button
                key={option.Value}
                type="button"
                className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ""}`}
                data-cursor="compact"
                /* Reachable by mouse/click, not by Enter-as-Tab's field walk (PLAN §13) —
                   it lives outside the natural tab sequence on purpose (useEnterAsTab.ts).
                   Keyboard reach comes from the input's own onKeyDown instead. */
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
                className={`${styles.option} ${styles.add} ${
                    results.length === highlightedIndex ? styles.highlighted : ""
                }`}
                data-cursor="compact"
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
    const {
        open,
        setOpen,
        highlightedIndex,
        results,
        showAddNew,
        pick,
        addNew,
        handleKeyDown,
        handleInputChange,
    } = useDropdownState({ value, onChange, onSearch, onPick, onAddNew });

    return (
        <div className={styles.wrapper}>
            <input
                autoComplete="off"
                {...inputProps}
                className={open ? styles.inputOpen : undefined}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={handleKeyDown}
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
                    highlightedIndex={highlightedIndex}
                />
            )}
        </div>
    );
};
