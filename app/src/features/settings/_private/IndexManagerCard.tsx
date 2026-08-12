import { Card } from "@components/Card";
import { useDataPort } from "@db/useDataPort";

import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { IndexCreateForm } from "./IndexCreateForm";
import { IndexList } from "./IndexList";
import { useIndexManagerActions } from "./useIndexManagerActions";

// Expression-index manager MVP (PLAN §6.3, §21 Medium bucket) — create/list/
// drop a SQLite expression index on a JSON path inside `doc.body`/
// `master.body`, without altering either table. All the SQL/security work
// is server-side (src-tauri/src/commands/indexes.rs, see its own doc
// comment for the validation trace); this card is just the admin-gated
// list + form around `DataPort.createCustomIndex`/`dropCustomIndex`. Size/
// usage stats and slow-query suggestions are explicitly future work, not
// this pass.
export const IndexManagerCard = () => {
    const db = useDataPort();
    const { unlocked } = useSettings();
    const { indexes, table, setTable, path, setPath, pathValid, busy, flash, handleCreate, handleDrop } =
        useIndexManagerActions(db);

    return (
        <Card
            title={<span className="lbl">Custom indexes</span>}
            headerRight={
                flash ? (
                    <span className={flash.bad ? styles.bad : styles.applied}>{flash.text}</span>
                ) : null
            }
        >
            <div className={styles.body}>
                <IndexList
                    indexes={indexes}
                    unlocked={unlocked}
                    busy={busy}
                    onDrop={(configId) => void handleDrop(configId)}
                />
                <IndexCreateForm
                    table={table}
                    setTable={setTable}
                    path={path}
                    setPath={setPath}
                    pathValid={pathValid}
                    unlocked={unlocked}
                    busy={busy}
                    onCreate={() => void handleCreate()}
                />
                <p className={styles.hint}>
                    Speeds up lookups on a field inside a ticket or master&apos;s JSON body — the
                    table itself never changes. Dropping an index is safe at any time; it never
                    touches the data.
                </p>
            </div>
        </Card>
    );
};
