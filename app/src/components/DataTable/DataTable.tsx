import type { ReactNode } from "react";

import { EmptyState } from "@components/EmptyState";

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

// A plain, unvirtualised table (PLAN §9.1 calls for row virtualisation and
// keyset pagination at 100,000-row scale — not built yet, tracked as a
// known gap in app/README.md; every master list here is small enough that
// it does not matter today). One shape for Masters and, later, Reports.
export const DataTable = <Row,>({
    columns,
    rows,
    getRowId,
    onRowClick,
    emptyMessage,
}: DataTableProps<Row>) => {
    if (rows.length === 0) {
        return <EmptyState title={emptyMessage ?? "Nothing here yet"} />;
    }

    return (
        <div className={styles.wrapper}>
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
                    {rows.map((row) => (
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
                </tbody>
            </table>
        </div>
    );
};
