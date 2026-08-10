import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import type { UseMasterCache } from "@db/useMasterCache";
import { useSchema } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import { RecallBanner } from "../RecallBanner";
import type { RecallOffer } from "../RecallBanner";
import { formatTicketNo } from "../ticketNumber";
import type { UseWeighingTicket } from "../useWeighingTicket";
import styles from "../WeighingScreen.module.css";

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
        <FieldGrid columns={2}>
            <Field
                id="fVeh"
                label={{ en: fieldLabel("VehicleNo") }}
                searchTitle={{ en: "Searches the Vehicles master" }}
            >
                <SearchableDropdown
                    id="fVeh"
                    value={ticket.fields.vehicleNo}
                    onChange={(value) => ticket.setField("vehicleNo", value)}
                    onSearch={(query) =>
                        vehicleCache.search(query).map((row) => ({
                            Value: row.MasterId,
                            Label: row.Name,
                        }))
                    }
                    onAddNew={(query) =>
                        void vehicleCache.save({
                            MasterKind: "Vehicle",
                            Name: query.trim(),
                            Body: {},
                        })
                    }
                    readOnly={ticket.isLocked}
                    spellCheck={false}
                />
            </Field>
            <Field id="fDate" label={{ en: "Ticket Date" }}>
                <input id="fDate" readOnly value={ticketDate} className={styles.dateField} />
            </Field>
        </FieldGrid>
        <FieldGrid columns={2}>
            <Field
                id="fParty"
                label={{ en: fieldLabel("Party") }}
                searchTitle={{ en: "Searches the Parties master" }}
                recalled={ticket.recalledFields.has("party")}
            >
                <SearchableDropdown
                    id="fParty"
                    value={ticket.fields.party}
                    onChange={(value) => ticket.setField("party", value)}
                    onSearch={(query) =>
                        partyCache.search(query).map((row) => ({
                            Value: row.MasterId,
                            Label: row.Name,
                        }))
                    }
                    onAddNew={(query) =>
                        void partyCache.save({
                            MasterKind: "Party",
                            Name: query.trim(),
                            Body: {},
                        })
                    }
                    readOnly={ticket.isLocked}
                />
            </Field>
            <Field
                id="fMat"
                label={{ en: fieldLabel("Material") }}
                searchTitle={{ en: "Searches the Materials master" }}
                recalled={ticket.recalledFields.has("material")}
            >
                <SearchableDropdown
                    id="fMat"
                    value={ticket.fields.material}
                    onChange={(value) => ticket.setField("material", value)}
                    onSearch={(query) =>
                        materialCache.search(query).map((row) => ({
                            Value: row.MasterId,
                            Label: row.Name,
                        }))
                    }
                    onAddNew={(query) =>
                        void materialCache.save({
                            MasterKind: "Material",
                            Name: query.trim(),
                            Body: {},
                        })
                    }
                    readOnly={ticket.isLocked}
                />
            </Field>
        </FieldGrid>
        <RecallBanner offers={recallOffers} />
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
            <Field
                id="fTrans"
                label={{ en: fieldLabel("Transporter") }}
                recalled={ticket.recalledFields.has("transporter")}
            >
                <SearchableDropdown
                    id="fTrans"
                    value={ticket.fields.transporter}
                    onChange={(value) => ticket.setField("transporter", value)}
                    onSearch={(query) =>
                        transporterCache.search(query).map((row) => ({
                            Value: row.MasterId,
                            Label: row.Name,
                        }))
                    }
                    onAddNew={(query) =>
                        void transporterCache.save({
                            MasterKind: "Transporter",
                            Name: query.trim(),
                            Body: {},
                        })
                    }
                    readOnly={ticket.isLocked}
                />
            </Field>
        </FieldGrid>
    </Card>
    );
};
