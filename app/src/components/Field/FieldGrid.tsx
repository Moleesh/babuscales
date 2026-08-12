import type { ReactNode } from "react";

import styles from "./_styles/Field.module.css";

export interface FieldGridProps {
    /** 1 = mock's ".fields" (stacked); 2/3/4 = mock's ".row2"/".row3"/".row4". */
    columns?: 1 | 2 | 3 | 4;
    children: ReactNode;
}

// `noUncheckedIndexedAccess` types every CSS-module property access as
// possibly-undefined (same reasoning as Button.tsx's VARIANT_CLASS/SIZE_CLASS).
const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string | undefined> = {
    1: styles.grid1,
    2: styles.grid2,
    3: styles.grid3,
    4: styles.grid4,
};

// Lays out a row of Fields side by side, collapsing to one column under
// 900px (mock's `@media (max-width:899px){.row2,.row3,.row4{...}}`).
export const FieldGrid = ({ columns = 1, children }: FieldGridProps) => (
    <div className={COLUMN_CLASS[columns]}>{children}</div>
);
