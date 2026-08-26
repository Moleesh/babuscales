import { useLayoutEffect, useState } from "react";

import { useCloseOnOutsideClick } from "@hooks/useCloseOnOutsideClick";

import styles from "./_styles/Select.module.css";

export interface SelectOption<T extends string> {
    value: T;
    label: string;
}

export interface SelectProps<T extends string> {
    id?: string;
    value: T;
    options: SelectOption<T>[];
    disabled?: boolean;
    onChange: (value: T) => void;
    /** Extra class on `.wrap`, alongside its own default `min-width: 160px`
     * — task: "make the language dropdown a little bigger, we have longer
     * language names and now two more icons in it". Every other caller
     * leaves this unset and keeps the default width. */
    className?: string;
}

// A plain `<select>`'s own dropdown list is drawn by the OS/webview, not
// this page — none of the app's CSS (or the custom cursor that replaces the
// native one everywhere else) can reach into it. This renders the
// whole list as ordinary DOM buttons instead, so it looks and behaves like
// the rest of the app rather than switching to native chrome the moment it
// opens.
export const Select = <T extends string>({ id, value, options, disabled, onChange, className }: SelectProps<T>) => {
    const [open, setOpen] = useState(false);
    const ref = useCloseOnOutsideClick(open, () => setOpen(false));
    const selected = options.find((option) => option.value === value);

    // Disabling the trigger (e.g. Settings' admin auto-lock firing mid-open,
    // while the dropdown is open and the admin password expires) only stops
    // new clicks; it doesn't touch `open`, so an already-open list stayed on screen,
    // floating over a now-disabled field. Force it shut the moment
    // `disabled` flips true instead of waiting for an outside click.
    useLayoutEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    return (
        <div className={className ? `${styles.wrap} ${className}` : styles.wrap} ref={ref}>
            <button
                id={id}
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.label}>{selected?.label ?? ""}</span>
                <span className={styles.chevron} aria-hidden="true">
                    ▾
                </span>
            </button>
            {open && (
                <div className={styles.list} role="listbox">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            data-cursor="compact"
                            className={`${styles.option} ${option.value === value ? styles.active : ""}`}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
