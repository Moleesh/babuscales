import { Card } from "@components/Card";
import type { MasterKind, MasterRow } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

import { MasterFormActions } from "./MasterFormActions";
import { MasterFormFields } from "./MasterFormFields";
import type { MasterFormState } from "./masterFormState";
import { StoredTareFormFields } from "./StoredTareFormFields";
import styles from "../_styles/MastersScreen.module.css";

export interface MastersFormCardProps {
    activeKind: MasterKind;
    columns: MasterColumn[];
    lang: string;
    selected: MasterRow | null;
    addNewLabel: string;
    form: MasterFormState;
    onChange: (next: MasterFormState) => void;
    saving: boolean;
    onSave: () => void;
    onToggleActive: () => void;
    onDelete: () => void;
    onStartNew: () => void;
    onReload: () => void;
    t: (key: string) => string;
}

// Split out of MastersScreen (over the line/complexity budget —
// docs/CodingStandards.md) — the add/edit form card (fields + action
// buttons). Now uses the t() function for translatable strings.
export const MastersFormCard = ({
    activeKind,
    columns,
    lang,
    selected,
    addNewLabel,
    form,
    onChange,
    saving,
    onSave,
    onToggleActive,
    onDelete,
    onStartNew,
    onReload,
    t,
}: MastersFormCardProps) => (
    <Card
        title={
            <span className="lbl">{selected ? `${t("masters.editPrefix")} ${selected.Name}` : addNewLabel}</span>
        }
    >
        <div className={styles.body}>
            {activeKind === "StoredTare" ? (
                <StoredTareFormFields form={form} onChange={onChange} />
            ) : (
                <MasterFormFields columns={columns} lang={lang} form={form} onChange={onChange} />
            )}
            <MasterFormActions
                selected={selected}
                saving={saving}
                canSave={Boolean(form.name.trim())}
                addNewLabel={addNewLabel}
                onSave={onSave}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
                onStartNew={onStartNew}
                onReload={onReload}
            />
        </div>
    </Card>
);
