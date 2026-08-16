import { useLayoutEffect, useRef, useState } from "react";

import { formatDate, formatDateInFmt } from "@constants/numberFormat";
import { useTranslation } from "@i18n/useTranslation";

import { buildMonthGrid, parseIsoDate, toIsoDate, WEEKDAY_LABELS } from "./_private/buildMonthGrid";
import styles from "./_styles/DatePicker.module.css";

export interface DatePickerProps {
    id?: string;
    /** "" (no date picked) or a plain "YYYY-MM-DD" — exactly what
     * `<input type="date">`'s own `.value` already produces/consumes, so
     * swapping this in is a drop-in replacement for every current consumer,
     * without changing any downstream data shape. */
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    /** Settings' `Formats.DateFmt` — the trigger renders the picked date in
     * this pattern via `formatDateInFmt` (constants/numberFormat.ts), same
     * as every other date on screen. Typed `string` (not the `DateFmt`
     * union) because `Settings.Formats.DateFmt` itself already flows
     * through the app as a plain string from here down (see
     * `useReportsScreenController`'s own `dateFmt: string` and
     * `formatDateInFmt`'s own signature) — narrowing only at this one leaf
     * would just require an unchecked cast at every call site. An
     * unrecognised pattern falls back the same way `formatDateInFmt` does.
     * Optional: a caller that hasn't threaded Settings through yet still
     * gets a sane, India-common default rather than being forced to plumb
     * it. */
    dateFmt?: string;
    "aria-label"?: string;
}

// Closes the popover on an outside click — same shape as Select's own
// `useCloseOnOutsideClick` (Select.tsx) and AppShell's TopBarOverflow.tsx,
// the repo's one recurring answer to "collapsible thing next to a trigger".
// Not imported from Select directly: Select doesn't export it, and three
// components independently needing four lines of outside-click wiring
// isn't worth a shared hook yet (PLAN's "not built yet" list, §3).
const useCloseOnOutsideClick = (open: boolean, onClose: () => void) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);
    return ref;
};

const todayIso = (): string => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
};

// A plain `<input type="date">`'s own popup is drawn by the OS/webview, not
// this page — same problem Select.tsx already solved for `<select>`: none
// of the app's CSS can theme it, and the custom cursor follower can't reach
// it either — hovering it would show the legacy native OS pointer instead
// of the app's custom cursor. This renders the whole calendar as ordinary
// DOM buttons instead, styled and cursor-tracked like the rest of the app.
export const DatePicker = ({ id, value, onChange, disabled, dateFmt, ...rest }: DatePickerProps) => {
    const { t, lang } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useCloseOnOutsideClick(open, () => setOpen(false));
    const today = todayIso();
    const parsed = parseIsoDate(value) ?? parseIsoDate(today)!;
    // The visible month starts on the picked date if there is one,
    // otherwise today — never January 1970 or some other value-less
    // default, which would make opening an empty field a chore to page
    // back from.
    const [view, setView] = useState(() => ({ year: parsed.year, month: parsed.month }));

    useLayoutEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const fmt = dateFmt ?? "dd-MM-yyyy";
    const label = value ? formatDateInFmt(value, lang, fmt) : fmt.toLowerCase();
    const monthLabel = formatDate(new Date(view.year, view.month, 1), lang, { month: "long", year: "numeric" });
    const grid = buildMonthGrid(view.year, view.month);

    const changeMonth = (delta: 1 | -1) => {
        setView(({ year, month }) => {
            const next = new Date(year, month + delta, 1);
            return { year: next.getFullYear(), month: next.getMonth() };
        });
    };

    const pick = (iso: string) => {
        onChange(iso);
        setOpen(false);
    };

    return (
        <div className={styles.wrap} ref={ref}>
            <button
                id={id}
                type="button"
                className={`${styles.trigger} ${open ? styles.triggerOpen : ""} ${value ? "" : styles.placeholder}`}
                disabled={disabled}
                // The default 38px hover ring dwarfs a single-row trigger
                // this compact (task screenshot: "remove the focus here its
                // look too odd") — same smaller ring the calendar's own
                // day/nav buttons already use below, and the same reasoning
                // as Select's option rows (CustomCursor.module.css's
                // `.hoverCompact`).
                data-cursor="compact"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={rest["aria-label"] ?? t("datePicker.openLabel")}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.label}>{label}</span>
                <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="1.5" y="2.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
                    <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.3" />
                    <line x1="4.5" y1="1" x2="4.5" y2="3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <line x1="11.5" y1="1" x2="11.5" y2="3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
            </button>
            {open && (
                <div className={styles.pop} role="dialog" aria-label={t("datePicker.openLabel")}>
                    <div className={styles.nav}>
                        <button
                            type="button"
                            className={styles.navBtn}
                            data-cursor="compact"
                            aria-label={t("datePicker.prevMonth")}
                            onClick={() => changeMonth(-1)}
                        >
                            ‹
                        </button>
                        <span className={styles.navLabel}>{monthLabel}</span>
                        <button
                            type="button"
                            className={styles.navBtn}
                            data-cursor="compact"
                            aria-label={t("datePicker.nextMonth")}
                            onClick={() => changeMonth(1)}
                        >
                            ›
                        </button>
                    </div>
                    <div className={styles.weekdays}>
                        {WEEKDAY_LABELS.map((weekday, index) => (
                            // Fixed 7-item constant — index is a stable identity here (no react/no-array-index-key plugin registered in eslint.config.js to suppress).
                            <span key={index}>{weekday}</span>
                        ))}
                    </div>
                    <div className={styles.grid}>
                        {grid.map((cell, index) =>
                            cell ? (
                                <button
                                    key={cell.iso}
                                    type="button"
                                    data-cursor="compact"
                                    className={`${styles.day} ${cell.iso === value ? styles.active : ""} ${cell.iso === today ? styles.today : ""}`}
                                    onClick={() => pick(cell.iso)}
                                >
                                    {cell.day}
                                </button>
                            ) : (
                                // Fixed 42-cell layout grid — blanks have no identity of their own, index is fine here.
                                <span key={index} className={styles.blank} />
                            ),
                        )}
                    </div>
                    <div className={styles.actions}>
                        <button type="button" className={styles.actionBtn} onClick={() => pick(todayIso())}>
                            {t("datePicker.today")}
                        </button>
                        <button type="button" className={styles.actionBtn} onClick={() => pick("")}>
                            {t("datePicker.clear")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
