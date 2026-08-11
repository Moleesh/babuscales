import { useEffect, useMemo, useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { MasterKind } from "@db/types";
import { useMasterCache } from "@db/useMasterCache";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { buildMasterColumns } from "./_private/masterColumns";
import { emptyForm } from "./_private/masterFormState";
import { MastersFormCard } from "./_private/MastersFormCard";
import { MastersListCard } from "./_private/MastersListCard";
import { useMasterFormActions } from "./_private/useMasterFormActions";
import { buildKindOptions, MASTER_KIND_META } from "./masterKindMeta";
import styles from "./MastersScreen.module.css";

// PLAN §9.1 — one screen for everything saved: Parties, Materials,
// Vehicles, Vehicle Types, Transporters, Places, Operators, Stored Tares.
// FTS5 search, row virtualisation, keyset pagination, merge-duplicates and
// bulk import/export are the real §9.1 spec at 100,000-row scale — not
// built yet, tracked as a known gap (app/README.md); client-side filtering
// over a per-kind cache (useMasterCache) covers demo/site-sized data today.
// Split into masterColumns/masterFormBody/masterFormState (data shaping),
// MastersListCard/MastersFormCard (the two Card blocks) and
// StoredTareFormFields/MasterFormFields/MasterFormActions/
// useMasterFormActions (form JSX + handlers) — see _private/ for each.
export const MastersScreen = () => {
    const { lang } = useTranslation();
    const [activeKind, setActiveKind] = useState<MasterKind>("Party");
    const { rows, loading, search, save, reload } = useMasterCache(activeKind);
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());
    const selected = selectedId ? (rows.find((row) => row.MasterId === selectedId) ?? null) : null;
    const { saving, selectRow, startNew, handleSave, toggleActive } = useMasterFormActions({
        activeKind,
        selected,
        form,
        setForm,
        setSelectedId,
        save,
    });

    useEffect(() => {
        setQuery("");
        setSelectedId(null);
        setForm(emptyForm());
    }, [activeKind]);

    const filtered = useMemo(() => search(query), [search, query]);
    const meta = MASTER_KIND_META[activeKind];
    const columns = useMemo(() => buildMasterColumns(activeKind, styles), [activeKind]);
    const kindOptions = useMemo(() => buildKindOptions(lang), [lang]);

    return (
        <div className={styles.screen}>
            <SegmentedControl
                options={kindOptions}
                value={activeKind}
                onChange={setActiveKind}
                ariaLabel="Master kind"
            />

            <MastersListCard
                title={resolveLocalized(meta.Label, lang)}
                count={rows.length}
                query={query}
                onQueryChange={setQuery}
                searchPlaceholder={resolveLocalized(meta.SearchPlaceholder, lang)}
                columns={columns}
                rows={filtered}
                loading={loading}
                onRowClick={selectRow}
            />

            <MastersFormCard
                activeKind={activeKind}
                selected={selected}
                addNewLabel={resolveLocalized(meta.AddNewLabel, lang)}
                form={form}
                onChange={setForm}
                saving={saving}
                onSave={() => void handleSave()}
                onToggleActive={() => void toggleActive()}
                onStartNew={startNew}
                onReload={() => reload()}
            />
        </div>
    );
};
