import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
        // Task: "on scroll close all the dropdowns, date drop down and other
        // custom dropdowns" — same reasoning as Select.tsx's own copy,
        // including the `contains` guard so scrolling inside the calendar
        // popover itself doesn't close it.
        const onScroll = (event: Event) => {
            if (ref.current && event.target instanceof Node && ref.current.contains(event.target)) return;
            onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [open, onClose]);
    return ref;
};

const todayIso = (): string => {
    const now = new Date();
    return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
};

interface DatePickerTriggerProps {
    id?: string;
    label: string;
    value: string;
    disabled?: boolean;
    open: boolean;
    ariaLabel: string;
    onToggle: () => void;
}

// The closed-state trigger button — pulled out of DatePicker purely to stay
// under the file's own line budget.
const DatePickerTrigger = ({ id, label, value, disabled, open, ariaLabel, onToggle }: DatePickerTriggerProps) => (
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
        aria-label={ariaLabel}
        onClick={onToggle}
    >
        <span className={styles.label}>{label}</span>
        <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.3" />
            <line x1="4.5" y1="1" x2="4.5" y2="3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="11.5" y1="1" x2="11.5" y2="3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    </button>
);

interface DatePickerCalendarProps {
    value: string;
    today: string;
    monthLabel: string;
    grid: ReturnType<typeof buildMonthGrid>;
    dialogLabel: string;
    onChangeMonth: (delta: 1 | -1) => void;
    onPick: (iso: string) => void;
    labels: { prevMonth: string; nextMonth: string; today: string; clear: string };
}

interface DatePickerGridProps {
    value: string;
    today: string;
    grid: ReturnType<typeof buildMonthGrid>;
    onPick: (iso: string) => void;
}

// The 42-cell day grid + its weekday header row — pulled out of
// DatePickerCalendar purely to stay under the file's own line budget.
const DatePickerGrid = ({ value, today, grid, onPick }: DatePickerGridProps) => (
    <>
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
                        onClick={() => onPick(cell.iso)}
                    >
                        {cell.day}
                    </button>
                ) : (
                    // Fixed 42-cell layout grid — blanks have no identity of their own, index is fine here.
                    <span key={index} className={styles.blank} />
                ),
            )}
        </div>
    </>
);

// The open popover's whole calendar — pulled out of DatePicker purely to
// stay under the file's own line budget.
const DatePickerCalendar = ({
    value,
    today,
    monthLabel,
    grid,
    dialogLabel,
    onChangeMonth,
    onPick,
    labels,
}: DatePickerCalendarProps) => (
    <div className={styles.pop} role="dialog" aria-label={dialogLabel}>
        <div className={styles.nav}>
            <button
                type="button"
                className={styles.navBtn}
                data-cursor="compact"
                aria-label={labels.prevMonth}
                onClick={() => onChangeMonth(-1)}
            >
                ‹
            </button>
            <span className={styles.navLabel}>{monthLabel}</span>
            <button
                type="button"
                className={styles.navBtn}
                data-cursor="compact"
                aria-label={labels.nextMonth}
                onClick={() => onChangeMonth(1)}
            >
                ›
            </button>
        </div>
        <DatePickerGrid value={value} today={today} grid={grid} onPick={onPick} />
        <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} onClick={() => onPick(today)}>
                {labels.today}
            </button>
            <button type="button" className={styles.actionBtn} onClick={() => onPick("")}>
                {labels.clear}
            </button>
        </div>
    </div>
);

// The visible month/grid/label state — pulled out of DatePicker purely to
// stay under the file's own line budget.
const useCalendarView = (value: string, dateFmt: string | undefined, lang: string, open: boolean) => {
    const today = todayIso();
    const parsed = parseIsoDate(value) ?? parseIsoDate(today)!;
    // The visible month starts on the picked date if there is one,
    // otherwise today — never January 1970 or some other value-less
    // default, which would make opening an empty field a chore to page
    // back from.
    const [view, setView] = useState(() => ({ year: parsed.year, month: parsed.month }));

    // Resyncs the visible month to a `value` that changed while the picker
    // was closed (e.g. a report's date field reset from elsewhere) — but
    // only while closed, so this never yanks the calendar out from under a
    // user who's mid-navigation in an open popover.
    useEffect(() => {
        if (open) return;
        setView({ year: parsed.year, month: parsed.month });
        // Depends on `open` too (not just parsed.year/month): a `value`
        // change that arrives *while* the picker is open must still resync
        // once it closes, not only on the next `value` change after that.
    }, [parsed.year, parsed.month, open]);

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

    return { today, label, monthLabel, grid, changeMonth };
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
    const { today, label, monthLabel, grid, changeMonth } = useCalendarView(value, dateFmt, lang, open);

    useLayoutEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const pick = (iso: string) => {
        onChange(iso);
        setOpen(false);
    };

    return (
        <div className={styles.wrap} ref={ref}>
            <DatePickerTrigger
                id={id}
                label={label}
                value={value}
                disabled={disabled}
                open={open}
                ariaLabel={rest["aria-label"] ?? t("datePicker.openLabel")}
                onToggle={() => setOpen((v) => !v)}
            />
            {open && (
                <DatePickerCalendar
                    value={value}
                    today={today}
                    monthLabel={monthLabel}
                    grid={grid}
                    dialogLabel={t("datePicker.openLabel")}
                    onChangeMonth={changeMonth}
                    onPick={pick}
                    labels={{
                        prevMonth: t("datePicker.prevMonth"),
                        nextMonth: t("datePicker.nextMonth"),
                        today: t("datePicker.today"),
                        clear: t("datePicker.clear"),
                    }}
                />
            )}
        </div>
    );
};
