import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import type { MasterKind } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import { useSchema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import { RecallBanner } from "../RecallBanner";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { buildTicketFormulaContext } from "./buildTicketFormulaContext";
import { SchemaFieldRow } from "./SchemaFieldRow";
import { FIXED_FIELD_IDS } from "./ticketFieldIds";

interface MasterDropdownFieldProps {
    id: string;
    masterKind: MasterKind;
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
// shape — search a master, offer "＋ Add" for a query with no match — so one
// component driven by `masterKind`/`cache`/`value`/`onChange` replaces four
// near-identical SearchableDropdown blocks below.
const MasterDropdownField = ({
    id,
    masterKind,
    label,
    searchTitle,
    recalled,
    value,
    onChange,
    cache,
    readOnly,
    spellCheck,
}: MasterDropdownFieldProps) => (
    <Field
        id={id}
        label={{ en: label }}
        searchTitle={searchTitle ? { en: searchTitle } : undefined}
        recalled={recalled}
    >
        <SearchableDropdown
            id={id}
            value={value}
            onChange={onChange}
            onSearch={(query) =>
                cache.search(query).map((row) => ({ Value: row.MasterId, Label: row.Name }))
            }
            onAddNew={(query) => void cache.save({ MasterKind: masterKind, Name: query.trim(), Body: {} })}
            readOnly={readOnly}
            spellCheck={spellCheck}
        />
    </Field>
);

interface VehicleDateRowProps {
    ticket: UseWeighingTicket;
    vehicleCache: UseMasterCache;
    vehicleLabel: string;
    ticketDate: string;
}

const VehicleDateRow = ({ ticket, vehicleCache, vehicleLabel, ticketDate }: VehicleDateRowProps) => {
    const { t } = useTranslation();
    return (
        <FieldGrid columns={2}>
            <MasterDropdownField
                id="fVeh"
                masterKind="Vehicle"
                label={vehicleLabel}
                searchTitle={t("weigh.searchVehicles")}
                value={ticket.fields.vehicleNo}
                onChange={(value) => ticket.setField("vehicleNo", value)}
                cache={vehicleCache}
                readOnly={ticket.isLocked}
                spellCheck={false}
            />
            <Field id="fDate" label={{ en: t("weigh.ticketDate") }}>
                <input id="fDate" readOnly value={ticketDate} className={styles.dateField} />
            </Field>
        </FieldGrid>
    );
};

interface PartyMaterialRowProps {
    ticket: UseWeighingTicket;
    partyCache: UseMasterCache;
    materialCache: UseMasterCache;
    partyLabel: string;
    materialLabel: string;
}

const PartyMaterialRow = ({
    ticket,
    partyCache,
    materialCache,
    partyLabel,
    materialLabel,
}: PartyMaterialRowProps) => {
    const { t } = useTranslation();
    return (
        <FieldGrid columns={2}>
            <MasterDropdownField
                id="fParty"
                masterKind="Party"
                label={partyLabel}
                searchTitle={t("weigh.searchParties")}
                recalled={ticket.recalledFields.has("party")}
                value={ticket.fields.party}
                onChange={(value) => ticket.setField("party", value)}
                cache={partyCache}
                readOnly={ticket.isLocked}
            />
            <MasterDropdownField
                id="fMat"
                masterKind="Material"
                label={materialLabel}
                searchTitle={t("weigh.searchMaterials")}
                recalled={ticket.recalledFields.has("material")}
                value={ticket.fields.material}
                onChange={(value) => ticket.setField("material", value)}
                cache={materialCache}
                readOnly={ticket.isLocked}
            />
        </FieldGrid>
    );
};

interface ChallanTransporterRowProps {
    ticket: UseWeighingTicket;
    transporterCache: UseMasterCache;
    transporterLabel: string;
}

const ChallanTransporterRow = ({
    ticket,
    transporterCache,
    transporterLabel,
}: ChallanTransporterRowProps) => {
    const { t } = useTranslation();
    return (
        <FieldGrid columns={2}>
            <Field id="fChal" label={{ en: t("weigh.challanNo") }}>
                <input
                    id="fChal"
                    value={ticket.fields.challanNo}
                    onChange={(event) => ticket.setField("challanNo", event.target.value)}
                    readOnly={ticket.isLocked}
                    autoComplete="off"
                />
            </Field>
            <MasterDropdownField
                id="fTrans"
                masterKind="Transporter"
                label={transporterLabel}
                recalled={ticket.recalledFields.has("transporter")}
                value={ticket.fields.transporter}
                onChange={(value) => ticket.setField("transporter", value)}
                cache={transporterCache}
                readOnly={ticket.isLocked}
            />
        </FieldGrid>
    );
};

interface CustomFieldsSectionProps {
    ticket: UseWeighingTicket;
    schemaFields: ReturnType<typeof useSchema>["ticketSchema"]["Fields"];
    vehicleCache: UseMasterCache;
    partyCache: UseMasterCache;
    materialCache: UseMasterCache;
    transporterCache: UseMasterCache;
}

// Any Field in the active Schema that isn't one of the 5 fixed ones above,
// rendered generically by SchemaFieldRow (PLAN §8). A schema with no such
// fields renders nothing here (`customFieldDefs` is `[]`) — but
// DEFAULT_TICKET_SCHEMA itself already carries one: a Formula-kind "Net"
// field (Abs(Gross - Tare)) that was previously dead data (TicketFieldsCard
// only ever read the 5 fixed FieldIds off the schema before this). Wiring
// this renderer in surfaces it for the first time — a deliberate, in-scope
// consequence of "make a custom field in the schema actually render", not a
// bug; flagged here because it means today's default ticket screen gains a
// visible Net row it didn't have before this change. Pulled out of
// TicketFieldsCard itself so that component's own body stays under the
// line budget.
const CustomFieldsSection = ({
    ticket,
    schemaFields,
    vehicleCache,
    partyCache,
    materialCache,
    transporterCache,
}: CustomFieldsSectionProps) => {
    const customFieldDefs = schemaFields.filter((field) => !FIXED_FIELD_IDS.includes(field.FieldId));
    if (customFieldDefs.length === 0) return null;

    const ctx = buildTicketFormulaContext(ticket, ticket.customFields);
    // Only the four master kinds already cached on this screen — a custom
    // Search field targeting any other MasterKind has nowhere to search
    // here; SchemaFieldRow renders its own "not yet supported" placeholder
    // for that case rather than this screen adding new useMasterCache calls.
    const masterCaches: Partial<Record<MasterKind, UseMasterCache>> = {
        Vehicle: vehicleCache,
        Party: partyCache,
        Material: materialCache,
        Transporter: transporterCache,
    };

    return (
        <FieldGrid columns={2}>
            {customFieldDefs.map((field) => (
                <SchemaFieldRow
                    key={field.FieldId}
                    field={field}
                    value={ticket.customFields[field.FieldId] ?? null}
                    onChange={(value) => ticket.setCustomField(field.FieldId, value)}
                    ctx={ctx}
                    readOnly={ticket.isLocked}
                    masterCaches={masterCaches}
                />
            ))}
        </FieldGrid>
    );
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
// — the "Ticket" card's four SearchableDropdown fields plus Challan No and
// the read-only date, exactly as laid out in demo/BabuScales-demo.html's
// `.grid2` field rows. Self-contained: everything it needs comes in as
// props, nothing here reaches back into WeighingScreen's own state.
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
    // task #50) rather than the hardcoded DEFAULT_TICKET_SCHEMA constant, and
    // resolves through the active language — previously this always showed
    // `.en` regardless of the language toggle, a real (if minor) bug.
    const { ticketSchema } = useSchema();
    const { lang, t } = useTranslation();
    const fieldLabel = (fieldId: string): string => {
        const field = ticketSchema.Fields.find((candidate) => candidate.FieldId === fieldId);
        return field ? resolveLocalized(field.Label, lang) : fieldId;
    };

    return (
        <Card
            title={<span className="lbl">{t("weigh.ticket")}</span>}
            headerRight={<span className="chip num">{formatTicketNo(ticket.docSeq)}</span>}
        >
            <VehicleDateRow
                ticket={ticket}
                vehicleCache={vehicleCache}
                vehicleLabel={fieldLabel("VehicleNo")}
                ticketDate={ticketDate}
            />
            <PartyMaterialRow
                ticket={ticket}
                partyCache={partyCache}
                materialCache={materialCache}
                partyLabel={fieldLabel("Party")}
                materialLabel={fieldLabel("Material")}
            />
            <RecallBanner offers={recallOffers} />
            <ChallanTransporterRow
                ticket={ticket}
                transporterCache={transporterCache}
                transporterLabel={fieldLabel("Transporter")}
            />
            <CustomFieldsSection
                ticket={ticket}
                schemaFields={ticketSchema.Fields}
                vehicleCache={vehicleCache}
                partyCache={partyCache}
                materialCache={materialCache}
                transporterCache={transporterCache}
            />
        </Card>
    );
};
