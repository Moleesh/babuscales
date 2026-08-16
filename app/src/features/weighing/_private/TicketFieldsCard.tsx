import { Fragment } from "react";
import type { ReactNode } from "react";

import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import type { MasterKind } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import { useSchema } from "@engines/schemaEngine";
import type { Field as SchemaField } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import { RecallBanner } from "../RecallBanner";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { buildTicketFormulaContext } from "./buildTicketFormulaContext";
import { SchemaFieldRow } from "./SchemaFieldRow";
import { evaluateFieldVisible } from "./schemaFieldValidation";
import { CAPTURE_FIELD_IDS, FIXED_FIELD_IDS } from "./ticketFieldIds";

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

// The 5 fixed FieldIds' actual controls — unchanged widgets, just picked by
// FieldId instead of by position, so a schema can reorder/hide/relabel them
// without this file growing a new branch per layout (task: "yes, fully
// schema-driven"). Capture buttons/stability logic live in CalcCard, not
// here, so there's nothing hardware-shaped in this switch at all.
const buildFixedControl = (fieldId: string, args: BuildFixedControlArgs): ReactNode => {
    const { ticket, label, t, vehicleCache, partyCache, materialCache, transporterCache } = args;
    switch (fieldId) {
        case "VehicleNo":
            return (
                <MasterDropdownField
                    id="fVeh"
                    label={label}
                    searchTitle={t("weigh.searchVehicles")}
                    value={ticket.fields.vehicleNo}
                    onChange={(value) => ticket.setField("vehicleNo", value)}
                    cache={vehicleCache}
                    readOnly={ticket.isLocked}
                    spellCheck={false}
                />
            );
        case "Party":
            return (
                <MasterDropdownField
                    id="fParty"
                    label={label}
                    searchTitle={t("weigh.searchParties")}
                    recalled={ticket.recalledFields.has("party")}
                    value={ticket.fields.party}
                    onChange={(value) => ticket.setField("party", value)}
                    cache={partyCache}
                    readOnly={ticket.isLocked}
                />
            );
        case "Material":
            return (
                <MasterDropdownField
                    id="fMat"
                    label={label}
                    searchTitle={t("weigh.searchMaterials")}
                    recalled={ticket.recalledFields.has("material")}
                    value={ticket.fields.material}
                    onChange={(value) => ticket.setField("material", value)}
                    cache={materialCache}
                    readOnly={ticket.isLocked}
                />
            );
        case "Transporter":
            return (
                <MasterDropdownField
                    id="fTrans"
                    label={label}
                    recalled={ticket.recalledFields.has("transporter")}
                    value={ticket.fields.transporter}
                    onChange={(value) => ticket.setField("transporter", value)}
                    cache={transporterCache}
                    readOnly={ticket.isLocked}
                />
            );
        case "ChallanNo":
            return (
                <Field id="fChal" label={label}>
                    <input
                        id="fChal"
                        value={ticket.fields.challanNo}
                        onChange={(event) => ticket.setField("challanNo", event.target.value)}
                        readOnly={ticket.isLocked}
                        autoComplete="off"
                    />
                </Field>
            );
        default:
            return null;
    }
};

// One fixed field's control, plus the read-only Date field paired right
// after Vehicle No — split out of buildFieldItems purely to keep that loop
// body under the line budget (docs/CodingStandards.md).
const buildFixedItems = (
    field: SchemaField,
    lang: string,
    ticketDate: string,
    args: Omit<BuildFixedControlArgs, "label">,
): { key: string; node: ReactNode }[] => {
    const label = resolveLocalized(field.Label, lang);
    const items: { key: string; node: ReactNode }[] = [
        { key: field.FieldId, node: buildFixedControl(field.FieldId, { ...args, label }) },
    ];
    // The read-only Ticket Date field has no schema backing of its own —
    // kept paired immediately after Vehicle No, same spot it has always
    // occupied, rather than growing a fake schema entry just to give it a
    // sort position.
    if (field.FieldId === "VehicleNo") {
        items.push({
            key: "TicketDate",
            node: (
                <Field id="fDate" label={args.t("weigh.ticketDate")}>
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

// One ordered pass over `ticketSchema.Fields` (PLAN §8) producing every grid
// item this card renders — the 5 fixed fields (dedicated controls, schema
// order/label/VisibleWhen), the always-present read-only Date field paired
// right after Vehicle No, and any other custom field (SchemaFieldRow,
// unchanged). Gross/Tare/Net/Charge FieldIds are skipped here entirely —
// CalcCard owns those boxes; a schema entry for one only supplies its label
// there (see ticketFieldIds.ts's CAPTURE_FIELD_IDS comment). Split out of
// TicketFieldsCard's own body so that component stays a plain layout shell.
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

    for (const field of schemaFields) {
        if (CAPTURE_FIELD_IDS.includes(field.FieldId)) continue;
        if (!evaluateFieldVisible(field, ctx)) continue;

        if (FIXED_FIELD_IDS.includes(field.FieldId)) {
            items.push(...buildFixedItems(field, lang, ticketDate, fixedArgs));
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
    recallOffers: RecallOffer[];
    vehicleCache: UseMasterCache;
    partyCache: UseMasterCache;
    materialCache: UseMasterCache;
    transporterCache: UseMasterCache;
}

// Split out of WeighingScreen (over the 300-line budget — docs/CodingStandards.md)
// — the "Ticket" card. Fully schema-driven (task: "no hard coding ... json
// only for all field"): every field, fixed or custom, renders in whatever
// order the active Schema's Fields array lists it in, using whichever
// control that FieldId maps to. Self-contained: everything it needs comes
// in as props, nothing here reaches back into WeighingScreen's own state.
export const TicketFieldsCard = ({
    ticket,
    ticketDate,
    recallOffers,
    vehicleCache,
    partyCache,
    materialCache,
    transporterCache,
}: TicketFieldsCardProps) => {
    // Reads the live, admin-editable schema (Settings → Fields & language,
    // task #50) rather than a hardcoded field list, resolved through the
    // active language.
    const { ticketSchema } = useSchema();
    const { lang, t } = useTranslation();

    const items = buildFieldItems({
        ticket,
        schemaFields: ticketSchema.Fields,
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
            title={<span className="lbl">{t("weigh.ticket")}</span>}
            headerRight={<span className="chip num">{formatTicketNo(ticket.docSeq)}</span>}
        >
            {chunkPairs(items).map((row) => (
                <FieldGrid key={row.map((item) => item.key).join("_")} columns={2}>
                    {row.map((item) => (
                        <Fragment key={item.key}>{item.node}</Fragment>
                    ))}
                </FieldGrid>
            ))}
            <RecallBanner offers={recallOffers} />
        </Card>
    );
};
