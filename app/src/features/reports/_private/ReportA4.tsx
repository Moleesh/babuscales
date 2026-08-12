import type { ReportSlipData } from "@engines/print";

import styles from "./_styles/ReportA4.module.css";

// The same fictional site identity SlipA4.tsx hardcodes (app/README.md
// known gap: no site-profile Setting yet) — kept in sync by hand until a
// real Settings pane owns it.
const SITE_NAME = "Babulens Enterprise";
const SITE_SUB = "Nagercoil · 9789597007";

export interface ReportA4Props {
    data: ReportSlipData;
}

// Ported from the mock's `reportA4` — real JSX (React escapes every cell
// automatically) rather than the mock's own `esc()`-guarded HTML string.
// The mock right-aligns every column but the first (`i ? "right" : "left"`
// on both `<th>` and `<td>`) — same rule here.
export const ReportA4 = ({ data }: ReportA4Props) => (
    <div className={styles.paper}>
        <div className={styles.head}>
            <div>
                <div className={styles.title}>{data.Title}</div>
                <div className={styles.range}>
                    {data.DateRange} · {SITE_SUB}
                </div>
            </div>
            <div className={styles.site}>{SITE_NAME}</div>
        </div>
        <table className={styles.table}>
            <thead>
                <tr>
                    {data.Head.map((cell, i) => (
                        <th key={cell} align={i ? "right" : "left"}>
                            {cell}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.Rows.map((row) => (
                    <tr key={row.join("|")}>
                        {row.map((cell, i) => (
                            <td key={`${i}-${cell}`} align={i ? "right" : "left"}>
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
        <div className={styles.footer}>
            <span>Printed {data.PrintedAt}</span>
        </div>
    </div>
);
