import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { DataTableColumn } from "./DataTable";
import styles from "./DataTable.module.css";
import { cssClass } from "../../testUtils";

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
});
