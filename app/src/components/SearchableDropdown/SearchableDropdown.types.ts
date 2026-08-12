import type { InputHTMLAttributes } from "react";

export interface SearchableDropdownOption {
    Value: string;
    Label: string;
    Sub?: string;
}

export interface SearchableDropdownProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "className"> {
    value: string;
    onChange: (text: string) => void;
    onSearch: (query: string) => SearchableDropdownOption[];
    onPick?: (option: SearchableDropdownOption) => void;
    onAddNew?: (query: string) => void;
    addNewLabel?: (query: string) => string;
    heading?: string;
}
