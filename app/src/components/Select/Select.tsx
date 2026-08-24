import { useLayoutEffect, useRef, useState } from "react";

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
}

// Closes the list on an outside click — same shape as AppShell's
// TopBarOverflow.tsx, which solves the identical "collapsible thing next to
// a trigger button" problem.
const useCloseOnOutsideClick = (open: boolean, onClose: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
        // Task: "on scroll close all the dropdowns" — an open list is
        // absolutely-positioned off the trigger's own rect (`top: 100%`
        // etc.), so it doesn't track the trigger during a scroll and ends up
        // floating over unrelated content. `capture: true` so this still
        // fires for scrolls inside any nested scroll container, not just the
        // window — but that also means the list's own `.list` (max-height +
        // overflow-y: auto, above) reports its internal scroll here too;
        // without the `contains` check, scrolling through a long option list
        // would close the very list being scrolled.
        const onScroll = (event: Event) => {
            if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return;
            onClose();
        };
        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [open, onClose]);
    return ref;
};

// A plain `<select>`'s own dropdown list is drawn by the OS/webview, not
// this page — none of the app's CSS (or the custom cursor that replaces the
// native one everywhere else) can reach into it. This renders the
// whole list as ordinary DOM buttons instead, so it looks and behaves like
// the rest of the app rather than switching to native chrome the moment it
// opens.
export const Select = <T extends string>({ id, value, options, disabled, onChange }: SelectProps<T>) => {
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
        <div className={styles.wrap} ref={ref}>
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
