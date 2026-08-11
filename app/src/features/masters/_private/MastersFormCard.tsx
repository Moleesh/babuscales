import { Card } from "@components/Card";
import type { MasterKind, MasterRow } from "@db/types";

import styles from "../MastersScreen.module.css";
import { MasterFormActions } from "./MasterFormActions";
import { MasterFormFields } from "./MasterFormFields";
import type { MasterFormState } from "./masterFormState";
import { StoredTareFormFields } from "./StoredTareFormFields";

export interface MastersFormCardProps {
    activeKind: MasterKind;
    selected: MasterRow | null;
    addNewLabel: string;
    form: MasterFormState;
    onChange: (next: MasterFormState) => void;
    saving: boolean;
    onSave: () => void;
    onToggleActive: () => void;
    onStartNew: () => void;
    onReload: () => void;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the add/edit form card (fields + action
// buttons), unchanged from the inline version it replaces.
export const MastersFormCard = ({
    activeKind,
    selected,
    addNewLabel,
    form,
    onChange,
    saving,
    onSave,
    onToggleActive,
    onStartNew,
    onReload,
}: MastersFormCardProps) => (
    <Card
        title={
            <span className="lbl">{selected ? `Edit — ${selected.Name}` : addNewLabel}</span>
        }
    >
        <div className={styles.body}>
            {activeKind === "StoredTare" ? (
                <StoredTareFormFields form={form} onChange={onChange} />
            ) : (
                <MasterFormFields activeKind={activeKind} form={form} onChange={onChange} />
            )}
            <MasterFormActions
                selected={selected}
                saving={saving}
                canSave={Boolean(form.name.trim())}
                addNewLabel={addNewLabel}
                onSave={onSave}
                onToggleActive={onToggleActive}
                onStartNew={onStartNew}
                onReload={onReload}
            />
        </div>
    </Card>
);
