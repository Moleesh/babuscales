import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import type { MasterKind } from "@db/types";
import type { UseMasterCache } from "@db/useMasterCache";
import { useSchema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { RecallBanner } from "../RecallBanner";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";
import styles from "../WeighingScreen.module.css";

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

const VehicleDateRow = ({ ticket, vehicleCache, vehicleLabel, ticketDate }: VehicleDateRowProps) => (
    <FieldGrid columns={2}>
        <MasterDropdownField
            id="fVeh"
            masterKind="Vehicle"
            label={vehicleLabel}
            searchTitle="Searches the Vehicles master"
            value={ticket.fields.vehicleNo}
            onChange={(value) => ticket.setField("vehicleNo", value)}
            cache={vehicleCache}
            readOnly={ticket.isLocked}
            spellCheck={false}
        />
        <Field id="fDate" label={{ en: "Ticket Date" }}>
            <input id="fDate" readOnly value={ticketDate} className={styles.dateField} />
        </Field>
    </FieldGrid>
);

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
}: PartyMaterialRowProps) => (
    <FieldGrid columns={2}>
        <MasterDropdownField
            id="fParty"
            masterKind="Party"
            label={partyLabel}
            searchTitle="Searches the Parties master"
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
            searchTitle="Searches the Materials master"
            recalled={ticket.recalledFields.has("material")}
            value={ticket.fields.material}
            onChange={(value) => ticket.setField("material", value)}
            cache={materialCache}
            readOnly={ticket.isLocked}
        />
    </FieldGrid>
);

interface ChallanTransporterRowProps {
    ticket: UseWeighingTicket;
    transporterCache: UseMasterCache;
    transporterLabel: string;
}

const ChallanTransporterRow = ({
    ticket,
    transporterCache,
    transporterLabel,
}: ChallanTransporterRowProps) => (
    <FieldGrid columns={2}>
        <Field id="fChal" label={{ en: "Challan No" }}>
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
    const { lang } = useTranslation();
    const fieldLabel = (fieldId: string): string => {
        const field = ticketSchema.Fields.find((candidate) => candidate.FieldId === fieldId);
        return field ? resolveLocalized(field.Label, lang) : fieldId;
    };

    return (
        <Card
            title={<span className="lbl">Ticket</span>}
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
        </Card>
    );
};
