import { Field, FieldGrid } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import styles from "./_styles/SystemPane.module.css";
import type { IndexTable } from "./useIndexManagerActions";

export interface IndexCreateFormProps {
    table: IndexTable;
    setTable: (table: IndexTable) => void;
    path: string;
    setPath: (path: string) => void;
    pathValid: boolean;
    unlocked: boolean;
    busy: boolean;
    onCreate: () => void;
}

// Split out of IndexManagerCard (over the line budget — docs/CodingStandards.md)
// — the Table/Path picker and Create button, unchanged from the inline
// version it replaces. Client-side `pathValid` is a UX nicety only; the
// real enforcement is `create_custom_index`'s regex check on the Rust side
// (src-tauri/src/commands/indexes.rs), which runs regardless of this.
export const IndexCreateForm = ({
    table,
    setTable,
    path,
    setPath,
    pathValid,
    unlocked,
    busy,
    onCreate,
}: IndexCreateFormProps) => {
    const { t } = useTranslation();
    return (
    <>
        <FieldGrid columns={2}>
            <Field id="ixTable" label={t("settings.indexManager.table")}>
                <select
                    id="ixTable"
                    value={table}
                    disabled={!unlocked}
                    onChange={(event) => setTable(event.target.value as IndexTable)}
                >
                    <option value="doc">doc</option>
                    <option value="master">master</option>
                </select>
            </Field>
            <Field id="ixPath" label={t("settings.indexManager.jsonPath")}>
                <input
                    id="ixPath"
                    type="text"
                    value={path}
                    disabled={!unlocked}
                    placeholder="VehicleNo or Address.City"
                    onChange={(event) => setPath(event.target.value)}
                />
            </Field>
        </FieldGrid>
        {!pathValid && (
            <p className={styles.bad}>Dot-separated names only, e.g. VehicleNo or Address.City.</p>
        )}
        <div className={styles.confirmRow}>
            <button
                type="button"
                className={styles.mini}
                disabled={!unlocked || busy || !path.trim() || !pathValid}
                onClick={onCreate}
            >
                Create
            </button>
        </div>
    </>
    );
};
