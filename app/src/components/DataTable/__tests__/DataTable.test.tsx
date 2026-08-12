import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { cssClass } from "../../../testUtils";
import styles from "../_styles/DataTable.module.css";
import { DataTable } from "../DataTable";
import type { DataTableColumn } from "../DataTable";

interface Row {
    id: string;
    name: string;
    qtyKg: number;
}

const ROWS: Row[] = [
    { id: "1", name: "Blue Metal", qtyKg: 1000 },
    { id: "2", name: "M-Sand", qtyKg: 2000 },
];

const COLUMNS: DataTableColumn<Row>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "qtyKg", header: "Qty", render: (row) => row.qtyKg, numeric: true },
];

describe("DataTable", () => {
    it("renders an EmptyState instead of a table when there are no rows", () => {
        render(<DataTable columns={COLUMNS} rows={[]} getRowId={(row: Row) => row.id} />);
        expect(screen.queryByRole("table")).toBeNull();
        expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    });

    it("renders a custom empty message when given", () => {
        render(
            <DataTable columns={COLUMNS} rows={[]} getRowId={(row: Row) => row.id} emptyMessage="No materials yet" />,
        );
        expect(screen.getByText("No materials yet")).toBeInTheDocument();
    });

    it("renders one header cell per column and one row per data row", () => {
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} />);
        expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Qty" })).toBeInTheDocument();
        expect(screen.getByText("Blue Metal")).toBeInTheDocument();
        expect(screen.getByText("M-Sand")).toBeInTheDocument();
    });

    it("applies the numeric class to numeric columns only", () => {
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} />);
        expect(screen.getByRole("columnheader", { name: "Qty" })).toHaveClass(cssClass(styles.numeric));
        expect(screen.getByRole("columnheader", { name: "Name" })).not.toHaveClass(cssClass(styles.numeric));
    });

    it("calls onRowClick with the clicked row when given", () => {
        const onRowClick = vi.fn();
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} onRowClick={onRowClick} />);
        fireEvent.click(screen.getByText("M-Sand"));
        expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
    });

    it("does not mark rows clickable when onRowClick isn't given", () => {
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} />);
        const cell = screen.getByText("Blue Metal");
        expect(cell.closest("tr")).not.toHaveClass(cssClass(styles.clickable));
    });

    it("invokes onRowClick when Enter is pressed on a focused row", () => {
        const onRowClick = vi.fn();
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} onRowClick={onRowClick} />);
        const row = screen.getByText("M-Sand").closest("tr") as HTMLElement;
        fireEvent.keyDown(row, { key: "Enter" });
        expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
    });

    it("invokes onRowClick when Space is pressed on a focused row", () => {
        const onRowClick = vi.fn();
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} onRowClick={onRowClick} />);
        const row = screen.getByText("Blue Metal").closest("tr") as HTMLElement;
        fireEvent.keyDown(row, { key: " " });
        expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
    });

    it("makes clickable rows focusable and marks them as buttons for assistive tech", () => {
        const onRowClick = vi.fn();
        render(<DataTable columns={COLUMNS} rows={ROWS} getRowId={(row) => row.id} onRowClick={onRowClick} />);
        const row = screen.getByText("Blue Metal").closest("tr") as HTMLElement;
        expect(row).toHaveAttribute("tabIndex", "0");
        expect(row).toHaveAttribute("role", "button");
    });
});
