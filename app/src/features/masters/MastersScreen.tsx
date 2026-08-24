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
import { buildKindOptions, visibleMasterKinds } from "./masterKindMeta";

// The kind/columns/options derivation Screen needs before it can render —
// pulled out purely to stay under the file's own line budget.
const useMastersScreenSetup = (
    ticketSchema: ReturnType<typeof useSchema>["ticketSchema"],
    settings: ReturnType<typeof useSettings>["settings"],
    lang: string,
    t: (key: string) => string,
) => {
    const [activeKind, setActiveKind] = useState<MasterKind>("Party");
    const kinds = useMemo(() => visibleMasterKinds(ticketSchema), [ticketSchema]);
    // The active kind can go stale when the schema changes out from under it
    // (an upload drops the kind currently open, or "Party" — the initial
    // default — isn't in this schema at all) — fall back to whatever kind
    // is actually available rather than showing an empty/mismatched screen.
    useEffect(() => {
        const fallback = kinds[0];
        if (!kinds.includes(activeKind) && fallback) setActiveKind(fallback);
    }, [kinds, activeKind]);
    // Which extra columns this kind's records carry — "specify what
    // all column we need for master ... that's how the master have to be
    // populated" — Schema.Masters, defaults to none for a kind the active
    // schema doesn't declare (an upload that predates this feature, or a
    // custom kind nobody configured columns for yet).
    const masterColumns = useMemo(
        () => ticketSchema.Masters?.find((entry) => entry.Kind === activeKind)?.Columns ?? [],
        [ticketSchema.Masters, activeKind],
    );
    // i18n keys keep the kind's own camelCase ("masters.vehicleType.label",
    // "masters.storedTare.label") — lowercasing the whole kind broke the
    // multi-word ones (masterKindMeta.ts's buildKindOptions had the same bug).
    const kindLower = activeKind.charAt(0).toLowerCase() + activeKind.slice(1);
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
    const kindOptions = useMemo(() => buildKindOptions(lang, t, kinds), [lang, t, kinds]);

    return { activeKind, setActiveKind, kinds, masterColumns, kindLower, columns, kindOptions };
};

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
    const [query, setQuery] = useState("");
    const { activeKind, setActiveKind, kinds, masterColumns, kindLower, columns, kindOptions } =
        useMastersScreenSetup(ticketSchema, settings, lang, t);
    const { totalCount, list, form } = useMastersScreenState(activeKind, masterColumns, query);

    useEffect(() => {
        setQuery("");
    }, [activeKind]);

    if (kinds.length === 0) {
        return (
            <div className={styles.screen}>
                <p>{t("masters.noneConfigured")}</p>
            </div>
        );
    }

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
                t={t}
                {...form}
            />
        </div>
    );
};
