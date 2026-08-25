import type { ReactNode } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { EmptyState } from "@components/EmptyState";
import { ScrollArea } from "@components/ScrollArea";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/DataTable.module.css";

export interface DataTableColumn<Row> {
    key: string;
    header: ReactNode;
    render: (row: Row) => ReactNode;
    numeric?: boolean;
    /** Fixed pixel width for this column's `th`/`td`, paired with
     * `tableClassName`'s `table-layout: fixed` (e.g. the Language table).
     * Under `table-layout: fixed`, any column left without a `width` splits
     * the table's remaining space instead of shrinking to its content — so
     * a caller can pin every column except one and let that one column
     * absorb whatever room is left, instead of the table stopping short of
     * its container and leaving a blank strip after the last column. */
    width?: number;
}

export interface DataTableProps<Row> {
    columns: DataTableColumn<Row>[];
    rows: Row[];
    getRowId: (row: Row) => string;
    onRowClick?: (row: Row) => void;
    emptyMessage?: ReactNode;
    /** Extra class on the `<table>` itself, alongside `.table`. Task: "too
     * many space"/"let the table take the whole space" — the Language
     * table's columns used to size themselves from fixed-width inner spans
     * under the default `table-layout: auto`, which either spread leftover
     * width out as gaps between columns (`width: 100%`) or left a blank
     * strip after the last one (`width: max-content`) depending on which
     * way it was fought. Pass a class that sets `table-layout: fixed` here
     * together with `width` on every column but one (see
     * `DataTableColumn.width`) — under fixed layout the one column left
     * without a width automatically absorbs all the table's remaining
     * space, so it fills the container exactly with no gap either side.
     * Every other caller (Masters, Reports, …) leaves this unset and keeps
     * the default auto layout. */
    tableClassName?: string;
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

// The row-range math itself — pulled out of DataTable purely to stay under
// the file's own line budget. See the callers' own comments for why
// `recompute` is a stable `useCallback` and why the effect uses a real
// object ref rather than a callback ref.
const useVirtualizedRowRange = (rowCount: number) => {
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
    }, [recompute, rowCount]);

    return { wrapperRef, rowHeightRef, range, recompute };
};

interface DataTableRowProps<Row> {
    row: Row;
    columns: DataTableColumn<Row>[];
    getRowId: (row: Row) => string;
    onRowClick?: (row: Row) => void;
}

// The column-header `<tr>` — identical in both the empty and populated
// branches below, pulled out purely to stay under DataTable's own line
// budget now that the empty branch grew a sticky wrapper (`.emptyPin`) of
// its own.
const DataTableHeaderRow = <Row,>({ columns }: { columns: DataTableColumn<Row>[] }) => (
    <thead>
        <tr>
            {columns.map((column) => (
                <th
                    key={column.key}
                    className={column.numeric ? styles.numeric : undefined}
                    style={column.width ? { width: column.width } : undefined}
                >
                    {column.header}
                </th>
            ))}
        </tr>
    </thead>
);

// One `<tr>` — pulled out of DataTable's render purely to stay under the
// file's own line budget.
const DataTableRow = <Row,>({ row, columns, getRowId, onRowClick }: DataTableRowProps<Row>) => (
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
                style={column.width ? { width: column.width } : undefined}
            >
                {column.render(row)}
            </td>
        ))}
    </tr>
);

// Windowed rendering (row virtualisation wasn't built yet —
// the Reports tab switch was still laggy after the ticket-fetch cache landed,
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
    tableClassName,
}: DataTableProps<Row>) => {
    const { t } = useTranslation();
    const { wrapperRef, rowHeightRef, range, recompute } = useVirtualizedRowRange(rows.length);

    // Task: "the header for report is mising" — the column header row used to
    // bail out entirely alongside the rows on an empty result (EmptyState
    // replaced the whole table), so a freshly-opened Reports screen with no
    // report applied yet showed nothing but the filter row above a blank
    // gap — no TICKET/VEHICLE/... labels to hint at what the table will
    // hold once a report is picked. The header (and its own sticky
    // behaviour) now always renders; only the body swaps to EmptyState.
    if (rows.length === 0) {
        return (
            <div className={styles.wrapper}>
                <table className={tableClassName ? `${styles.table} ${tableClassName}` : styles.table}>
                    <DataTableHeaderRow columns={columns} />
                </table>
                {/* Task: "the messge is scolling along with the scroll bar" —
                    `.wrapper` is the same `overflow-x: auto` box the wide
                    `<table>` above scrolls in (Reports Tickets/Masters both
                    have more columns than fit); as a plain static sibling in
                    that flow, EmptyState's box scrolled off with the header
                    the moment the user dragged the new horizontal thumb,
                    even though there are no body rows to actually scroll to.
                    `.emptyPin` sticks it to the viewport's left edge the same
                    way `.table th` already sticks to the top. */}
                <div className={styles.emptyPin}>
                    <EmptyState title={emptyMessage ?? t("dataTable.emptyDefault")} />
                </div>
            </div>
        );
    }

    const rowHeight = rowHeightRef.current;
    const start = Math.min(range.start, rows.length);
    const end = Math.min(range.end, rows.length);
    const visibleRows = rows.slice(start, end);
    const topSpacerHeight = start * rowHeight;
    const bottomSpacerHeight = (rows.length - end) * rowHeight;

    // `className={styles.wrapperOuter}` on top of the usual
    // `contentClassName={styles.wrapper}` — ScrollArea's plain positioning
    // `.area` div (ScrollArea.module.css) has no sizing of its own, so
    // without this it never shrinks as a flex item of a fill-mode ancestor
    // (Masters' `.body-fill-inner`); it just grows to fit every row, and the
    // real scrolling `.content` div inside it (sized correctly via
    // `.wrapper`) never gets a chance to clip anything, since its own
    // parent already expanded to match. `.wrapperOuter` mirrors `.wrapper`'s
    // sizing but deliberately skips its `overflow-x`/`-y` — duplicating that
    // too would make this outer div scroll natively itself instead of just
    // sizing around the real, custom-scrollbar `.content` div. Reports'
    // table never surfaced this because it bounds itself with a hard
    // `--datatable-max-height` vh calc instead of relying on the flex chain
    // at all.
    return (
        <ScrollArea contentRef={wrapperRef} className={styles.wrapperOuter} contentClassName={styles.wrapper} onScroll={recompute}>
            <table className={tableClassName ? `${styles.table} ${tableClassName}` : styles.table}>
                <DataTableHeaderRow columns={columns} />
                <tbody>
                    {topSpacerHeight > 0 && (
                        <tr aria-hidden="true">
                            <td colSpan={columns.length} style={{ height: topSpacerHeight, padding: 0, border: "none" }} />
                        </tr>
                    )}
                    {visibleRows.map((row) => (
                        <DataTableRow
                            key={getRowId(row)}
                            row={row}
                            columns={columns}
                            getRowId={getRowId}
                            onRowClick={onRowClick}
                        />
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
