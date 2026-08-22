import { Fragment } from "react";
import type { ReactNode } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import type { MasterKind } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import { resolveFieldIdLabel } from "@engines/schemaEngine";
import type { Field as SchemaField } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import { RecallBanner } from "../RecallBanner";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { applyAutofill } from "./applyAutofill";
import { buildTicketFormulaContext } from "./buildTicketFormulaContext";
import { SchemaFieldRow } from "./SchemaFieldRow";
import { evaluateFieldVisible } from "./schemaFieldValidation";
import { FIXED_FIELD_IDS } from "./ticketFieldIds";

interface MasterDropdownFieldProps {
    id: string;
    label: string;
    searchTitle?: string;
    recalled?: boolean;
    value: string;
    onChange: (value: string) => void;
    cache: UseMasterCache;
    readOnly: boolean;
    spellCheck?: boolean;
}

// The four ⌕ fields (Vehicle, Party, Material, Transporter) are all the same
// shape — search a master, take whatever text the operator types — so one
// component driven by `cache`/`value`/`onChange` replaces four
// near-identical SearchableDropdown blocks below. Task: no more inline
// "＋ Add" row — a value that doesn't match an existing master is just typed
// text until save time, when useWeighingScreenTickets.ts's handleSave
// reconciles it into the Masters table itself (upsertTypedMasters.ts).
const MasterDropdownField = ({
    id,
    label,
    searchTitle,
    recalled,
    value,
    onChange,
    cache,
    readOnly,
    spellCheck,
}: MasterDropdownFieldProps) => (
    <Field id={id} label={label} searchTitle={searchTitle} recalled={recalled}>
        <SearchableDropdown
            id={id}
            value={value}
            onChange={onChange}
            onSearch={(query) =>
                cache.search(query).map((row) => ({ Value: row.MasterId, Label: row.Name }))
            }
            readOnly={readOnly}
            spellCheck={spellCheck}
        />
    </Field>
);

interface FixedFieldCaches {
    vehicleCache: UseMasterCache;
    partyCache: UseMasterCache;
    materialCache: UseMasterCache;
    transporterCache: UseMasterCache;
}

interface BuildFixedControlArgs extends FixedFieldCaches {
    ticket: UseWeighingTicket;
    label: string;
    t: (key: string) => string;
}

// Applies a Search field's own `Autofills` (e.g. Material → a Rate field)
// the instant its master row is picked — same "just for that second, still
// editable after" contract SchemaFieldRow's SearchInput uses (task: "we
// won't be disabling it ... it is just autofilled for that particular
// second"). Looked up by Name, not MasterId: SearchableDropdown's `pick()`
// (useDropdownState.ts) hands its wrapping `onChange` the picked option's
// `Label` — the display string, not the underlying master id — so a fixed
// Search field's `onChange` carries `row.Name`, same as SchemaFieldRow's.
const applyFixedAutofill = (field: SchemaField, cache: UseMasterCache, ticket: UseWeighingTicket, value: string): void => {
    if (field.Kind !== "Search" || !field.Autofills?.length) return;
    const row = cache.rows.find((candidate) => candidate.Name === value);
    if (!row) return;
    applyAutofill(field, row, ticket.setCustomField);
};

// The typed-state binding for each of the 5 fixed FieldIds — necessary
// wiring (ticket.fields is a typed struct, not the generic customFields bag
// SchemaFieldRow reads from), kept as a small per-FieldId lookup rather than
// duplicated inline in every branch of buildFixedControl below.
interface FixedFieldAccessor {
    id: string;
    getValue: (ticket: UseWeighingTicket) => string;
    setValue: (ticket: UseWeighingTicket, value: string) => void;
    searchTitleKey?: string;
    recalledKey?: "party" | "material" | "transporter";
    spellCheck?: boolean;
}

const FIXED_FIELD_ACCESSORS: Record<string, FixedFieldAccessor> = {
    VehicleNo: {
        id: "fVeh",
        getValue: (ticket) => ticket.fields.vehicleNo,
        setValue: (ticket, value) => ticket.setField("vehicleNo", value),
        searchTitleKey: "weigh.searchVehicles",
        spellCheck: false,
    },
    Party: {
        id: "fParty",
        getValue: (ticket) => ticket.fields.party,
        setValue: (ticket, value) => ticket.setField("party", value),
        searchTitleKey: "weigh.searchParties",
        recalledKey: "party",
    },
    Material: {
        id: "fMat",
        getValue: (ticket) => ticket.fields.material,
        setValue: (ticket, value) => ticket.setField("material", value),
        searchTitleKey: "weigh.searchMaterials",
        recalledKey: "material",
    },
    Transporter: {
        id: "fTrans",
        getValue: (ticket) => ticket.fields.transporter,
        setValue: (ticket, value) => ticket.setField("transporter", value),
        recalledKey: "transporter",
    },
    ChallanNo: {
        id: "fChal",
        getValue: (ticket) => ticket.fields.challanNo,
        setValue: (ticket, value) => ticket.setField("challanNo", value),
    },
};

// The 5 fixed FieldIds' actual controls — which widget renders now comes
// from the schema's own `field.Kind` instead of a hardcoded per-FieldId switch; only the
// typed-state binding above stays keyed by FieldId, since ticket.fields is a
// typed struct rather than the generic customFields bag. Capture
// buttons/stability logic live in CalcCard, not here (kept as-is — those are
// hardware-tied, not a pure rendering choice).
const buildFixedControl = (field: SchemaField, args: BuildFixedControlArgs): ReactNode => {
    const { ticket, label, t, vehicleCache, partyCache, materialCache, transporterCache } = args;
    const accessor = FIXED_FIELD_ACCESSORS[field.FieldId];
    if (!accessor) return null;
    const masterCaches: Partial<Record<MasterKind, UseMasterCache>> = {
        Vehicle: vehicleCache,
        Party: partyCache,
        Material: materialCache,
        Transporter: transporterCache,
    };

    switch (field.Kind) {
        case "Search": {
            const cache = field.Master ? masterCaches[field.Master] : undefined;
            if (!cache) return null;
            return (
                <MasterDropdownField
                    id={accessor.id}
                    label={label}
                    searchTitle={accessor.searchTitleKey ? t(accessor.searchTitleKey) : undefined}
                    recalled={accessor.recalledKey ? ticket.recalledFields.has(accessor.recalledKey) : undefined}
                    value={accessor.getValue(ticket)}
                    onChange={(value) => {
                        accessor.setValue(ticket, value);
                        applyFixedAutofill(field, cache, ticket, value);
                    }}
                    cache={cache}
                    readOnly={ticket.isLocked}
                    spellCheck={accessor.spellCheck}
                />
            );
        }
        case "Text":
            return (
                <Field id={accessor.id} label={label}>
                    <input
                        id={accessor.id}
                        value={accessor.getValue(ticket)}
                        onChange={(event) => accessor.setValue(ticket, event.target.value)}
                        readOnly={ticket.isLocked}
                        autoComplete="off"
                    />
                </Field>
            );
        // The 5 fixed FieldIds only ever ship as Search or Text in
        // defaultTicketSchema.ts today; any other Kind here would mean an
        // admin retyped a built-in field's Kind in the schema editor —
        // render nothing rather than guess at a control for it.
        case "Number":
        case "Weight":
        case "Money":
        case "Date":
        case "DateTime":
        case "TicketDate":
        case "Boolean":
        case "Select":
        case "Formula":
        case "Sequence":
        case "Media":
        case "Note":
        default:
            return null;
    }
};

interface BuildFixedItemsArgs {
    field: SchemaField;
    lang: string;
    ticketDate: string;
    ticketDateField: SchemaField | undefined;
    controlArgs: Omit<BuildFixedControlArgs, "label">;
}

// One fixed field's control, plus the read-only Date field paired right
// after Vehicle No — split out of buildFieldItems purely to keep that loop
// body under the line budget (docs/CodingStandards.md).
const buildFixedItems = ({
    field,
    lang,
    ticketDate,
    ticketDateField,
    controlArgs: args,
}: BuildFixedItemsArgs): { key: string; node: ReactNode }[] => {
    // Built-in fixed fields ship with no schema `Label` at all (see
    // defaultTicketSchema.ts's own comment) — fall back to the shared
    // FieldId → i18n-key convention; only a genuinely custom FieldId with no
    // entry anywhere falls all the way back to its raw FieldId.
    const label = field.Label ? resolveLocalized(field.Label, lang) : resolveFieldIdLabel(field.FieldId, args.t);
    const items: { key: string; node: ReactNode }[] = [
        { key: field.FieldId, node: buildFixedControl(field, { ...args, label }) },
    ];
    // The read-only Ticket Date field is paired immediately after Vehicle
    // No, same spot it's always occupied — but only when the active schema
    // actually declares a "TicketDate" FieldId (defaultTicketSchema.ts) and
    // hasn't hidden it via `Visible: false`, same as any other field.
    if (field.FieldId === "VehicleNo" && ticketDateField && evaluateFieldVisible(ticketDateField)) {
        const dateLabel = ticketDateField.Label
            ? resolveLocalized(ticketDateField.Label, lang)
            : resolveFieldIdLabel("TicketDate", args.t);
        items.push({
            key: "TicketDate",
            node: (
                <Field id="fDate" label={dateLabel}>
                    <input id="fDate" readOnly value={ticketDate} className={styles.dateField} />
                </Field>
            ),
        });
    }
    return items;
};

interface FieldsListArgs extends FixedFieldCaches {
    ticket: UseWeighingTicket;
    schemaFields: SchemaField[];
    ticketDate: string;
    lang: string;
    t: (key: string) => string;
}

// One ordered pass over `ticketSchema.Fields` producing every grid
// item this card renders — the 5 fixed fields (dedicated controls, schema
// order/label/Visible), the always-present read-only Date field paired
// right after Vehicle No, and any other custom field (SchemaFieldRow,
// unchanged). Any `Calculated` field (default schema: Gross/Tare/Net/Charge)
// is skipped here entirely — CalcCard owns those boxes; a schema entry for
// one only supplies its label there (see ticketFieldIds.ts's
// isCalculatedField comment). Split out of TicketFieldsCard's own body so
// that component stays a plain layout shell.
const buildFieldItems = ({
    ticket,
    schemaFields,
    ticketDate,
    lang,
    t,
    vehicleCache,
    partyCache,
    materialCache,
    transporterCache,
}: FieldsListArgs): { key: string; node: ReactNode }[] => {
    const ctx = buildTicketFormulaContext(ticket, ticket.customFields);
    const masterCaches: Partial<Record<MasterKind, UseMasterCache>> = {
        Vehicle: vehicleCache,
        Party: partyCache,
        Material: materialCache,
        Transporter: transporterCache,
    };
    const items: { key: string; node: ReactNode }[] = [];
    const fixedArgs = { ticket, t, vehicleCache, partyCache, materialCache, transporterCache };
    // TicketDate has no control of its own in the generic loop below — it's
    // spliced in right after VehicleNo by buildFixedItems instead, so it's
    // looked up once here rather than re-found on every VehicleNo pass.
    const ticketDateField = schemaFields.find((field) => field.FieldId === "TicketDate");

    for (const field of schemaFields) {
        if (field.FieldId === "TicketDate") continue;
        // No `isCalculatedField` check needed anymore — this loop only ever
        // sees an `"Enterable"` segment's own `Fields` (WeighingLeftColumn),
        // which under the segment-Kind-is-authoritative model can never
        // contain a calculated field.
        if (!evaluateFieldVisible(field)) continue;

        if (FIXED_FIELD_IDS.includes(field.FieldId)) {
            items.push(...buildFixedItems({ field, lang, ticketDate, ticketDateField, controlArgs: fixedArgs }));
            continue;
        }

        items.push({
            key: field.FieldId,
            node: (
                <SchemaFieldRow
                    field={field}
                    value={ticket.customFields[field.FieldId] ?? null}
                    onChange={(value) => ticket.setCustomField(field.FieldId, value)}
                    ctx={ctx}
                    readOnly={ticket.isLocked}
                    masterCaches={masterCaches}
                    onAutofill={(row) => applyAutofill(field, row, ticket.setCustomField)}
                />
            ),
        });
    }
    return items;
};

// Groups the flat, schema-ordered item list into `.grid2` rows — FieldGrid
// itself is a pure CSS wrapper with no pairing logic of its own (checked
// FieldGrid.tsx), so whoever composes children into it has to chunk them.
const chunkPairs = <T,>(items: T[]): T[][] => {
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return rows;
};

export interface TicketFieldsCardProps {
    ticket: UseWeighingTicket;
    ticketDate: string;
    /** This card's own title — one `FieldSegment`'s resolved Label (or its
     * i18n fallback), not a fixed "Ticket" string, now that WeighingLeftColumn
     * renders one TicketFieldsCard per `"Enterable"` segment (task: Godown's
     * 2 top enterable cards). */
    title: ReactNode;
    /** One `FieldSegment.Fields` slice — just this card's own fields, not
     * every field in the schema (WeighingLeftColumn passes each
     * `"Enterable"` segment's own `Fields` here). */
    fields: SchemaField[];
    /** The ticket-number chip in the header, and the recall banner beneath
     * the grid — both are ticket-identity UI that only makes sense once, so
     * WeighingLeftColumn only sets this on the first `"Enterable"` segment's
     * card, not every one. */
    primary?: boolean;
    recallOffers: RecallOffer[];
    vehicleCache: UseMasterCache;
    partyCache: UseMasterCache;
    materialCache: UseMasterCache;
    transporterCache: UseMasterCache;
}

// Split out of WeighingScreen (over the 300-line budget — docs/CodingStandards.md)
// — one "Enterable" segment's card. Fully schema-driven: every field, fixed
// or custom, renders in whatever order this segment's own `Fields` list
// them in, using whichever control that FieldId maps to. Self-contained:
// everything it needs comes in as props, nothing here reaches back into
// WeighingScreen's own state.
export const TicketFieldsCard = ({
    ticket,
    ticketDate,
    title,
    fields,
    primary,
    recallOffers,
    vehicleCache,
    partyCache,
    materialCache,
    transporterCache,
}: TicketFieldsCardProps) => {
    const { lang, t } = useTranslation();

    const items = buildFieldItems({
        ticket,
        schemaFields: fields,
        ticketDate,
        lang,
        t,
        vehicleCache,
        partyCache,
        materialCache,
        transporterCache,
    });

    return (
        <Card
            title={<span className="lbl">{title}</span>}
            headerRight={primary ? <span className="chip num">{formatTicketNo(ticket.docSeq)}</span> : undefined}
        >
            {items.length === 0 && <p className={styles.emptySchema}>{t("weigh.ticket.empty")}</p>}
            {chunkPairs(items).map((row) => (
                <FieldGrid key={row.map((item) => item.key).join("_")} columns={2}>
                    {row.map((item) => (
                        <Fragment key={item.key}>{item.node}</Fragment>
                    ))}
                </FieldGrid>
            ))}
            {primary && <RecallBanner offers={recallOffers} />}
        </Card>
    );
};
