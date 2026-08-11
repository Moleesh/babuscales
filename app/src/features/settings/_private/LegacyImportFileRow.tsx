import type { RefObject } from "react";

import styles from "./SystemPane.module.css";

export interface LegacyImportFileRowProps {
    inputRef: RefObject<HTMLInputElement | null>;
    fileName: string | null;
    hasResult: boolean;
    committing: boolean;
    onFile: (file: File) => void;
    onClear: () => void;
}

// Split out of LegacyImportCard (over the line budget — docs/CodingStandards.md)
// — the file picker + name + Clear button row, unchanged from the inline
// version it replaces.
export const LegacyImportFileRow = ({
    inputRef,
    fileName,
    hasResult,
    committing,
    onFile,
    onClear,
}: LegacyImportFileRowProps) => (
    <div className={styles.statusRow}>
        <label className={`${styles.mini} ${committing ? styles.miniLabelDisabled : ""}`}>
            Choose import file…
            <input
                ref={inputRef}
                type="file"
                accept=".json"
                hidden
                disabled={committing}
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onFile(file);
                }}
            />
        </label>
        {fileName && <span className={styles.hint}>{fileName}</span>}
        {(fileName || hasResult) && (
            <button type="button" className={styles.mini} disabled={committing} onClick={onClear}>
                Clear
            </button>
        )}
    </div>
);
