import { useEffect, useRef, useState } from "react";

import styles from "./OperatorChip.module.css";
import { useSettings } from "./useSettings";

// The top-bar `#opChip`/`#opEdit` (demo/BabuScales-demo.html) — click the
// chip, it becomes a text input pre-filled and selected, blur or Enter
// commits. Not admin-gated: the mock's own comment calls this "operator
// comfort", not configuration — anyone on shift can say who they are.
export const OperatorChip = () => {
    const { settings, setOperatorName } = useSettings();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(settings.OperatorName);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!editing) setDraft(settings.OperatorName);
    }, [settings.OperatorName, editing]);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const commit = (): void => {
        setEditing(false);
        void setOperatorName(draft);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                className={`chip ${styles.input}`}
                aria-label="Operator name"
                // Excludes this input from useEnterAsTab's global walk — see
                // that hook's own comment for why an unmarked Enter here
                // would get hijacked instead of committing the chip.
                data-enter-skip
                value={draft}
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        commit();
                    }
                    if (event.key === "Escape") {
                        setDraft(settings.OperatorName);
                        setEditing(false);
                    }
                }}
            />
        );
    }

    return (
        <button className="chip act" title="Change operator" onClick={() => setEditing(true)}>
            Operator:&nbsp;<b>{settings.OperatorName}</b>&nbsp;✎
        </button>
    );
};
