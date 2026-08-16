import { useEffect, useMemo, useState } from "react";

import { SegmentedControl } from "@components/SegmentedControl";
import type { MasterKind } from "@db/types";
import { useSchema } from "@engines/schemaEngine";
import { useSettings } from "@features/settings";
import { useTranslation } from "@i18n/useTranslation";

import { buildMasterColumns } from "./_private/masterColumns";
import { MastersFormCard } from "./_private/MastersFormCard";
import { MastersListCard } from "./_private/MastersListCard";
import { useMastersScreenState } from "./_private/useMastersScreenState";
import styles from "./_styles/MastersScreen.module.css";
import { buildKindOptions } from "./masterKindMeta";

// One screen for everything saved: Parties, Materials,
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
    const { settings } = useSettings();
    const { ticketSchema } = useSchema();
    const [activeKind, setActiveKind] = useState<MasterKind>("Party");
    const [query, setQuery] = useState("");
    // Which extra columns this kind's records carry — "specify what
    // all column we need for master ... that's how the master have to be
    // populated" — Schema.Masters, defaults to none for a kind the active
    // schema doesn't declare (an upload that predates this feature, or a
    // custom kind nobody configured columns for yet).
    const masterColumns = useMemo(
        () => ticketSchema.Masters?.find((entry) => entry.Kind === activeKind)?.Columns ?? [],
        [ticketSchema.Masters, activeKind],
    );
    const { totalCount, reload, list, form } = useMastersScreenState(activeKind, masterColumns, query);

    useEffect(() => {
        setQuery("");
    }, [activeKind]);

    const kindLower = activeKind.toLowerCase();
    const columns = useMemo(
        () =>
            buildMasterColumns({
                activeKind,
                masterColumns,
                styles,
                t,
                lang,
                weightUnit: settings.Formats.WeightUnit,
                dateFmt: settings.Formats.DateFmt,
                timeFmt: settings.Formats.TimeFmt,
            }),
        [activeKind, masterColumns, t, lang, settings.Formats.WeightUnit, settings.Formats.DateFmt, settings.Formats.TimeFmt],
    );
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
                columns={masterColumns}
                lang={lang}
                addNewLabel={t(`masters.${kindLower}.addNew`)}
                onReload={() => reload()}
                t={t}
                {...form}
            />
        </div>
    );
};
