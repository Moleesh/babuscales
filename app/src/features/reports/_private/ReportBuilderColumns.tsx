import { useTranslation } from "@i18n/useTranslation";

import { ticketColumnOptions } from "../reportRows";
import type { TicketColumnKey } from "../reportRows";
import styles from "./_styles/ReportBuilderModal.module.css";

export interface ReportBuilderColumnsProps {
    visibleColumnKeys: TicketColumnKey[] | null;
    onVisibleColumnKeysChange: (keys: TicketColumnKey[] | null) => void;
}

// Split out of ReportBuilderModal (over the line/complexity budget —
// docs/CodingStandards.md) — the "which columns" checkbox grid. `null`
// means "all columns", same convention buildTicketColumns itself uses, so
// every box shows checked when nothing has been unchecked yet.
export const ReportBuilderColumns = ({
    visibleColumnKeys,
    onVisibleColumnKeysChange,
}: ReportBuilderColumnsProps) => {
    const { t } = useTranslation();
    const options = ticketColumnOptions(t);
    const selected = visibleColumnKeys ?? options.map((option) => option.value);

    const toggle = (key: TicketColumnKey): void => {
        const next = selected.includes(key)
            ? selected.filter((existing) => existing !== key)
            : [...selected, key];
        onVisibleColumnKeysChange(next.length === options.length ? null : next);
    };

    return (
        <fieldset className={styles.columns}>
            <legend>{t("reports.builder.columnsLabel")}</legend>
            {options.map((option) => (
                <label key={option.value} className={styles.columnItem}>
                    <input
                        type="checkbox"
                        checked={selected.includes(option.value)}
                        onChange={() => toggle(option.value)}
                    />
                    {option.label}
                </label>
            ))}
        </fieldset>
    );
};
