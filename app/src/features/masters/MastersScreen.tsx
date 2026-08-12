import { useEffect, useMemo, useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { MasterKind } from "@db/types";
import { useTranslation } from "@i18n/useTranslation";

import { buildMasterColumns } from "./_private/masterColumns";
import { MastersFormCard } from "./_private/MastersFormCard";
import { MastersListCard } from "./_private/MastersListCard";
import { useMastersScreenState } from "./_private/useMastersScreenState";
import styles from "./_styles/MastersScreen.module.css";
import { buildKindOptions } from "./masterKindMeta";

// PLAN §9.1 — one screen for everything saved: Parties, Materials,
// Vehicles, Vehicle Types, Transporters, Places, Operators, Stored Tares.
// FTS5 search and row virtualisation are still not built (app/README.md
// known gap); keyset pagination for the visible list is (useMasterListPage,
// "Load more"). Record selection/editing and every SearchableDropdown
// elsewhere still go through useMasterCache's "load once, filter every
// keystroke locally" cache, untouched — see useMasterCache.ts.
// Split into masterColumns/masterFormBody/masterFormState (data shaping),
// MastersListCard/MastersFormCard (the two Card blocks),
// useMastersScreenState (data wiring) and
// StoredTareFormFields/MasterFormFields/MasterFormActions/
// useMasterFormActions (form JSX + handlers) — see _private/ for each.
export const MastersScreen = () => {
    const { lang, t } = useTranslation();
    const [activeKind, setActiveKind] = useState<MasterKind>("Party");
    const [query, setQuery] = useState("");
    const { totalCount, reload, list, form } = useMastersScreenState(activeKind, query);

    useEffect(() => {
        setQuery("");
    }, [activeKind]);

    const kindLower = activeKind.toLowerCase();
    const columns = useMemo(() => buildMasterColumns(activeKind, styles, t), [activeKind, t]);
    const kindOptions = useMemo(() => buildKindOptions(lang, t), [lang, t]);

    return (
        <div className={styles.screen}>
            <SegmentedControl
                options={kindOptions}
                value={activeKind}
                onChange={setActiveKind}
                ariaLabel={t("masters.kindLabel")}
            />

            <MastersListCard
                title={t(`masters.${kindLower}.label`)}
                count={totalCount}
                query={query}
                onQueryChange={setQuery}
                searchPlaceholder={t(`masters.${kindLower}.search`)}
                columns={columns}
                t={t}
                {...list}
            />

            <MastersFormCard
                activeKind={activeKind}
                addNewLabel={t(`masters.${kindLower}.addNew`)}
                onReload={() => reload()}
                t={t}
                {...form}
            />
        </div>
    );
};
