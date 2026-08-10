import { useEffect, useMemo, useState } from "react";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Field, FieldGrid } from "@components/Field";
import { SearchableDropdown } from "@components/SearchableDropdown";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import { StatusPill } from "@components/StatusPill";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { CaptureType } from "@db/ticketBody";
import type { DocRow } from "@db/types";
import { useDataPort } from "@db/useDataPort";
import { useMasterCache } from "@db/useMasterCache";
import { computeCharge } from "@engines/billing";
import { useIndicator, useIndicatorReading } from "@engines/indicator";
import { buildSlipData } from "@engines/print";
import { DEFAULT_TICKET_SCHEMA } from "@engines/schemaEngine";
import { computeCameraBurnIn, CAMERA_SLOTS, CameraGrid } from "@features/cameras";
import { useSettings } from "@features/settings";

import { buildRecallOffers } from "./_private/buildRecallOffers";
import { PrintPreviewModal } from "./_private/PrintPreviewModal";
import { OpenTicketStrip } from "./OpenTicketStrip";
import { listOpenTickets } from "./recall";
import type { OpenTicketSummary } from "./recall";
import { RecallBanner } from "./RecallBanner";
import { formatTicketNo } from "./ticketNumber";
import type { UseWeighingTicket } from "./useWeighingTicket";
import styles from "./WeighingScreen.module.css";

const fieldLabel = (fieldId: string): string =>
    DEFAULT_TICKET_SCHEMA.Fields.find((field) => field.FieldId === fieldId)?.Label.en ?? fieldId;

const KIND_OPTIONS: SegmentedOption<CaptureType>[] = [
    { value: "Tare", label: "Tare" },
    { value: "Gross", label: "Gross" },
];

const formatStamp = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleString() : "—";

export interface WeighingScreenProps {
    /** Lifted to Shell (PLAN §13.1) so Reports can resume a ticket into the same deck across a tab switch. */
    ticket: UseWeighingTicket;
}

// PLAN §7 end to end: an ordered capture array (§7.1), a stability-gated
// deck (§13), one status derived from the weights (§7.4), the open-ticket
// strip so many lorries can be in flight at once (§7.5), a simplified
// recall banner (§9.2), and the mock's own `camCard` sidebar (a decorative
// preview tied to this same ticket state — @features/cameras). Real
// print-template editing is a separate, not-yet-built feature
// (app/README.md known gap) — this screen does not render it.
export const WeighingScreen = ({ ticket }: WeighingScreenProps) => {
    const db = useDataPort();
    const indicator = useIndicator();
    const reading = useIndicatorReading();
    const { settings } = useSettings();

    const [allTicketDocs, setAllTicketDocs] = useState<DocRow[]>([]);
    const [refreshToken, setRefreshToken] = useState(0);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void db.listDocs({ DocKind: "Ticket" }).then((rows) => {
            if (!cancelled) setAllTicketDocs(rows);
        });
        return () => {
            cancelled = true;
        };
    }, [db, refreshToken]);

    const vehicleCache = useMasterCache("Vehicle");
    const partyCache = useMasterCache("Party");
    const materialCache = useMasterCache("Material");
    const transporterCache = useMasterCache("Transporter");
    const storedTareCache = useMasterCache("StoredTare");

    const openTickets = useMemo(
        () => listOpenTickets(allTicketDocs).filter((t) => t.doc.DocId !== ticket.docId),
        [allTicketDocs, ticket.docId],
    );

    const handleResume = (summary: OpenTicketSummary): void => {
        ticket.resume(summary.doc);
    };

    const handleSave = async (): Promise<void> => {
        await ticket.save();
        setRefreshToken((n) => n + 1);
    };

    const handlePrint = async (): Promise<void> => {
        await ticket.print();
        setRefreshToken((n) => n + 1);
    };

    const armed =
        reading.Stable &&
        reading.WeightKg > 0 &&
        ticket.captures.length < 2 &&
        !!ticket.kind &&
        !ticket.isLocked;

    // Rules.AutoCapture (mock: `if (rules.autoCapture) setTimeout(capture, 350)`,
    // fired once per settle) — the deck's own tick loop stops the instant it
    // reports Stable, so `reading.WeightKg` is steady for the lifetime of this
    // effect; nothing re-triggers the timer until the next `armed` transition.
    useEffect(() => {
        if (!armed || !settings.Rules.AutoCapture) return;
        const timer = setTimeout(() => ticket.capture(reading.WeightKg), 350);
        return () => clearTimeout(timer);
    }, [armed, settings.Rules.AutoCapture, reading.WeightKg, ticket]);

    const recallOffers = useMemo(
        () =>
            buildRecallOffers({
                ticket,
                allTicketDocs,
                storedTareCache,
                strictTare: settings.Rules.StrictTare,
            }),
        [ticket, allTicketDocs, storedTareCache, settings.Rules.StrictTare],
    );

    const charge = computeCharge(ticket.weights.netKg !== null);

    const slipData = useMemo(
        () =>
            buildSlipData({
                ticketNo: formatTicketNo(ticket.docSeq),
                vehicleNo: ticket.fields.vehicleNo,
                party: ticket.fields.party,
                material: ticket.fields.material,
                challanNo: ticket.fields.challanNo,
                transporter: ticket.fields.transporter,
                tareKg: ticket.weights.tareKg,
                grossKg: ticket.weights.grossKg,
                netKg: ticket.weights.netKg,
                tareAt: ticket.captures.find((c) => c.Type === "Tare")?.At ?? null,
                grossAt: ticket.captures.find((c) => c.Type === "Gross")?.At ?? null,
                operator: settings.OperatorName,
                printCount: ticket.printCount,
                charge,
                amountDp: settings.Formats.AmountDp,
            }),
        [ticket, settings.OperatorName, settings.Formats.AmountDp, charge],
    );

    const cameraBurnIn = computeCameraBurnIn(ticket.docSeq, ticket.captures);
    const configuredCameraCount = CAMERA_SLOTS.filter((slot) => slot.configured).length;

    const ticketDate = formatStamp(ticket.captures[0]?.At);
    const captureLabel = ticket.isComplete
        ? "Both weights captured"
        : ticket.kind === "Gross"
          ? "Capture Gross"
          : "Capture Tare";
    const captureHint = ticket.isComplete
        ? "Save to finish this ticket"
        : armed
          ? "Stable — capture now"
          : "Waiting for a stable reading";

    return (
        <div className={styles.screen}>
            <OpenTicketStrip tickets={openTickets} onResume={handleResume} />
            <div className={styles.layout}>
                <div className={styles.col}>
                    <Card
                        title={<span className="lbl">Ticket</span>}
                        headerRight={
                            <span className="chip num">{formatTicketNo(ticket.docSeq)}</span>
                        }
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
                                <input
                                    id="fDate"
                                    readOnly
                                    value={ticketDate}
                                    className={styles.dateField}
                                />
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
                                    onChange={(event) =>
                                        ticket.setField("challanNo", event.target.value)
                                    }
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

                    <Card title={<span className="lbl">Captured &amp; calculated</span>}>
                        <div className={styles.calc}>
                            <div className={styles.calcBox}>
                                <span className="lbl">Tare</span>
                                <b className={styles.calcValue}>
                                    {ticket.weights.tareKg !== null
                                        ? formatWeightKg(ticket.weights.tareKg)
                                        : "—"}
                                </b>
                                <div className={styles.calcStamp}>
                                    {formatStamp(
                                        ticket.captures.find((c) => c.Type === "Tare")?.At,
                                    )}
                                </div>
                            </div>
                            <div className={styles.calcBox}>
                                <span className="lbl">Gross</span>
                                <b className={styles.calcValue}>
                                    {ticket.weights.grossKg !== null
                                        ? formatWeightKg(ticket.weights.grossKg)
                                        : "—"}
                                </b>
                                <div className={styles.calcStamp}>
                                    {formatStamp(
                                        ticket.captures.find((c) => c.Type === "Gross")?.At,
                                    )}
                                </div>
                            </div>
                            <div
                                className={`${styles.calcBox} ${ticket.weights.netKg !== null ? styles.calcLead : ""}`}
                            >
                                <span className="lbl">Net</span>
                                <b className={styles.calcValue}>
                                    {ticket.weights.netKg !== null
                                        ? formatWeightKg(ticket.weights.netKg)
                                        : "—"}
                                </b>
                                <div className={styles.calcStamp}>&nbsp;</div>
                            </div>
                            <div
                                className={`${styles.calcBox} ${charge === null ? styles.calcPending : ""}`}
                            >
                                <span className="lbl">Charge</span>
                                <b className={styles.calcValue}>
                                    {charge === null
                                        ? "—"
                                        : formatMoney(charge, settings.Formats.AmountDp)}
                                </b>
                                <div className={styles.calcStamp}>&nbsp;</div>
                            </div>
                        </div>
                        <StatusPill
                            tareKg={ticket.weights.tareKg}
                            grossKg={ticket.weights.grossKg}
                        />
                    </Card>
                </div>

                <div className={styles.col}>
                    <Card
                        title={<span className="lbl">Actions</span>}
                        headerRight={<span className="chip num">{ticket.printCount} prints</span>}
                    >
                        <div style={{ display: "grid", gap: 9 }}>
                            <SegmentedControl
                                options={KIND_OPTIONS.map((option) => ({
                                    ...option,
                                    disabled:
                                        ticket.captures.some((c) => c.Type === option.value) ||
                                        ticket.isLocked,
                                }))}
                                value={ticket.kind ?? "Tare"}
                                onChange={ticket.setKind}
                                size="big"
                                ariaLabel="Capture as"
                            />
                            <Button
                                variant="primary"
                                size="large"
                                disabled={!armed}
                                caption={captureHint}
                                onClick={() => ticket.capture(reading.WeightKg)}
                            >
                                {captureLabel}
                            </Button>
                            <div className={styles.actions}>
                                <Button
                                    disabled={
                                        ticket.isLocked ||
                                        ticket.captures.length === 0 ||
                                        ticket.saving
                                    }
                                    onClick={() => void handleSave()}
                                >
                                    {ticket.isComplete ? "Save" : "Save & park"}
                                </Button>
                                <Button
                                    disabled={!ticket.isLocked || ticket.printCount > 0}
                                    onClick={() => setPrintModalOpen(true)}
                                >
                                    Print
                                </Button>
                            </div>
                            <div className={styles.actions}>
                                <Button
                                    disabled={ticket.printCount === 0}
                                    onClick={() => setPrintModalOpen(true)}
                                >
                                    Reprint
                                </Button>
                                <Button onClick={ticket.startNew}>New ticket</Button>
                            </div>
                            <div className={styles.actions}>
                                <Button
                                    variant="danger"
                                    disabled={ticket.isLocked}
                                    onClick={ticket.clear}
                                >
                                    Clear
                                </Button>
                                {indicator.loadLorry && (
                                    <Button
                                        disabled={
                                            ticket.captures.length >= 2 ||
                                            ticket.isLocked ||
                                            !ticket.kind
                                        }
                                        onClick={() =>
                                            ticket.kind && indicator.loadLorry?.(ticket.kind)
                                        }
                                    >
                                        Send a lorry
                                    </Button>
                                )}
                            </div>
                            <p className={styles.hint}>
                                {ticket.isLocked
                                    ? ticket.printCount > 0
                                        ? "Printed."
                                        : "Saved — ready to print."
                                    : ticket.isComplete
                                      ? "Both weights captured — Save to finish."
                                      : reading.WeightKg === 0 && reading.Stable
                                        ? "Deck empty. Send a lorry to begin."
                                        : armed
                                          ? "Stable — capture now."
                                          : "Weight in motion — capture is locked until it settles."}
                            </p>
                        </div>
                    </Card>

                    <Card
                        title={<span className="lbl">Cameras</span>}
                        headerRight={
                            <span className="chip">
                                {configuredCameraCount} of {CAMERA_SLOTS.length} configured
                            </span>
                        }
                    >
                        <CameraGrid
                            vehicleNo={ticket.fields.vehicleNo}
                            burnIn={cameraBurnIn}
                            variant="sidebar"
                        />
                    </Card>
                </div>
            </div>
            <PrintPreviewModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                data={slipData}
                onSend={() => void handlePrint()}
                sending={ticket.saving}
            />
        </div>
    );
};
