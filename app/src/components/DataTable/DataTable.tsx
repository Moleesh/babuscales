import type { ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { EmptyState } from "@components/EmptyState";
import { ScrollArea } from "@components/ScrollArea";

import styles from "./_styles/DataTable.module.css";

export interface DataTableColumn<Row> {
    key: string;
    header: ReactNode;
    render: (row: Row) => ReactNode;
    numeric?: boolean;
}

export interface DataTableProps<Row> {
    columns: DataTableColumn<Row>[];
    rows: Row[];
    getRowId: (row: Row) => string;
    onRowClick?: (row: Row) => void;
    emptyMessage?: ReactNode;
}

// Estimated row height (px) used to compute which rows are in view before
// any row has actually been measured — `.table td`'s own padding/line-height
// (DataTable.module.css) settles around this. Only matters for the first
// frame; `onScroll` below re-measures against the real first `<tr>` as soon
// as one exists and self-corrects from there.
const ESTIMATED_ROW_HEIGHT = 37;
// Extra rows rendered above/below the visible band so a fast scroll or a
// keyboard PageDown doesn't show a flash of empty space before the next
// frame's row range catches up.
const OVERSCAN = 8;

// Windowed rendering (PLAN §9.1's "row virtualisation... not built yet" —
// task: Reports tab switch still laggy after the ticket-fetch cache landed,
// traced to *this* component always mounting every row's real `<tr>` DOM
// node regardless of dataset size). `.wrapper` is now its own bounded,
// scrollable region (DataTable.module.css) instead of growing the whole
// page, so only the rows actually scrolled into view — plus `OVERSCAN` on
// each side — ever exist in the DOM. Two spacer rows (not padding on
// `<tbody>`, which isn't a valid flex/box target here) hold the scrollbar's
// total height so the browser's own scroll math stays correct without this
// component reserving space for every off-screen row's real markup.
export const DataTable = <Row,>({
    columns,
    rows,
    getRowId,
    onRowClick,
    emptyMessage,
}: DataTableProps<Row>) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const rowHeightRef = useRef(ESTIMATED_ROW_HEIGHT);
    const [range, setRange] = useState({ start: 0, end: OVERSCAN * 2 });

    // `useCallback` with no deps, not an inline closure on the `ref`/`onScroll`
    // props: a plain object `ref` (not a callback) is what's used below, so
    // this only needs to be stable for `onScroll` — but the earlier version
    // of this fix *did* use an inline callback ref, which React detaches and
    // reattaches on every render (new function identity each time), calling
    // `recompute` → `setRange` → re-render → new ref identity → forever.
    // Kept as one `useCallback` anyway so `onScroll` itself never needs to
    // change identity across renders either.
    const recompute = useCallback(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        // Re-measure against a real row once one has rendered — DPI/zoom/
        // font-load can all shift the actual height away from the estimate.
        // `:not([aria-hidden])`, NOT a bare `"tbody tr"`: once `start > 0`
        // (i.e. any time you've scrolled past the first row), the actual
        // first `<tr>` in the DOM is the top spacer, whose height is this
        // same measurement fed back in from the *previous* recompute — that
        // measured-a-spacer bug is exactly what made the whole table go
        // blank on scroll (spacer height compounds every recompute until
        // the visible range is computed as empty). Spacers are the only
        // rows carrying `aria-hidden="true"`, so excluding those always
        // lands on a real content row instead.
        const firstRow = wrapper.querySelector("tbody tr:not([aria-hidden])");
        if (firstRow) rowHeightRef.current = firstRow.getBoundingClientRect().height || ESTIMATED_ROW_HEIGHT;
        const rowHeight = rowHeightRef.current;
        const start = Math.max(0, Math.floor(wrapper.scrollTop / rowHeight) - OVERSCAN);
        const visibleCount = Math.ceil(wrapper.clientHeight / rowHeight) + OVERSCAN * 2;
        const end = start + visibleCount;
        // Bail on an unchanged range — without this, mounting fires
        // `recompute` via the effect below, which (even correctly) still
        // triggers one extra render for the exact same numbers every time
        // the row count changes but the visible window doesn't.
        setRange((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
    }, []);

    // Real object ref (not a callback ref) + a layout effect instead: this
    // runs once after the wrapper is actually in the DOM and again whenever
    // the row count changes (a filter/sort narrowing the table can leave the
    // old scroll position past the new bottom), without re-running on every
    // unrelated render the way a fresh callback-ref function identity would.
    useLayoutEffect(() => {
        recompute();
    }, [recompute, rows.length]);

    if (rows.length === 0) {
        return <EmptyState title={emptyMessage ?? "Nothing here yet"} />;
    }

    const rowHeight = rowHeightRef.current;
    const start = Math.min(range.start, rows.length);
    const end = Math.min(range.end, rows.length);
    const visibleRows = rows.slice(start, end);
    const topSpacerHeight = start * rowHeight;
    const bottomSpacerHeight = (rows.length - end) * rowHeight;

    return (
        <ScrollArea contentRef={wrapperRef} contentClassName={styles.wrapper} onScroll={recompute}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={column.numeric ? styles.numeric : undefined}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {topSpacerHeight > 0 && (
                        <tr aria-hidden="true">
                            <td colSpan={columns.length} style={{ height: topSpacerHeight, padding: 0, border: "none" }} />
                        </tr>
                    )}
                    {visibleRows.map((row) => (
                        <tr
                            key={getRowId(row)}
                            className={onRowClick ? styles.clickable : undefined}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            tabIndex={onRowClick ? 0 : undefined}
                            role={onRowClick ? "button" : undefined}
                            onKeyDown={
                                onRowClick
                                    ? (event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                              event.preventDefault();
                                              onRowClick(row);
                                          }
                                      }
                                    : undefined
                            }
                        >
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={column.numeric ? styles.numeric : undefined}
                                >
                                    {column.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {bottomSpacerHeight > 0 && (
                        <tr aria-hidden="true">
                            <td colSpan={columns.length} style={{ height: bottomSpacerHeight, padding: 0, border: "none" }} />
                        </tr>
                    )}
                </tbody>
            </table>
        </ScrollArea>
    );
};
