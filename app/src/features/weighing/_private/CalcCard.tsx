import { Card } from "@components/Card";
import { StatusPill } from "@components/StatusPill";
import { formatDateTimeInFmt, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import type { Capture, CaptureType } from "@db/ticketBody";
import type { DerivedWeights } from "@db/ticketBody";
import { hasCapture } from "@db/ticketBody";
import type { Schema } from "@engines/schemaEngine";
import { useTranslation } from "@i18n/useTranslation";

import { CalcFormula } from "./CalcFormula";
import { ManualCalcBox } from "./ManualCalcBox";
import { evaluateFieldVisible } from "./schemaFieldValidation";
import { resolveFieldLabel } from "./ticketFieldIds";
import styles from "../_styles/WeighingScreen.module.css";

// Every box in this card — Gross/Tare included — only renders when its
// FieldId is actually present in the active schema; a schema that omits
// Gross/Tare entirely (e.g. a minimal ticket type with no scale capture)
// genuinely has no such box, same as any other field a schema doesn't
// declare. `Visible: false` on a field that *is* present still just hides
// it (evaluateFieldVisible, same helper TicketFieldsCard/SchemaFieldRow
// use) rather than dropping it from the schema outright.
const isBoxVisible = (ticketSchema: Schema, fieldId: string): boolean => {
    const field = ticketSchema.Fields.find((candidate) => candidate.FieldId === fieldId);
    return !!field && evaluateFieldVisible(field);
};

const formatStamp = (
    iso: string | undefined,
    lang: string,
    dateFmt: string,
    timeFmt: "24" | "12",
): string => (iso ? formatDateTimeInFmt(iso, lang, dateFmt, timeFmt) : "—");

interface CalcBoxProps {
    label: string;
    value: string;
    lead?: boolean;
    pending?: boolean;
    stamp?: string;
}

// The mock's own `.calc` box, repeated four times (Tare/Gross/Net/Charge)
// with only the label/value/modifier changing — pulled out so CalcCard's
// own body reads as "four boxes" instead of four near-identical blocks.
const CalcBox = ({ label, value, lead, pending, stamp }: CalcBoxProps) => (
    <div
        className={`${styles.calcBox} ${lead ? styles.calcLead : ""} ${pending ? styles.calcPending : ""}`}
    >
        <span className="lbl">{label}</span>
        <b className={styles.calcValue}>{value}</b>
        <div className={styles.calcStamp}>{stamp ?? <>&nbsp;</>}</div>
    </div>
);

interface ChargeBoxProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    readOnly: boolean;
}

// Charge used to be a read-only CalcBox showing an auto-derived amount; now
// it's a plain editable field, same as Challan No — no auto-calc. Kept inside the
// same four-box grid rather than moved to TicketFieldsCard since it's still
// conceptually part of "Captured & calculated," just no longer computed.
const ChargeBox = ({ label, value, onChange, readOnly }: ChargeBoxProps) => (
    <div className={styles.calcBox}>
        <span className="lbl">{label}</span>
        <input
            className={styles.calcChargeInput}
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            readOnly={readOnly}
            placeholder="—"
            autoComplete="off"
        />
        <div className={styles.calcStamp}>&nbsp;</div>
    </div>
);

interface TareGrossBoxesProps {
    weights: DerivedWeights;
    captures: Capture[];
    grossCaptures: Capture[];
    manualTare: boolean;
    manualGross: boolean;
    onManualCapture: (weightKg: number, kind: CaptureType) => void;
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
    grossLabel: string;
    tareLabel: string;
    showGross: boolean;
    showTare: boolean;
}

// Pulled out of CalcCard's own body (over the line budget —
// docs/CodingStandards.md) — the Tare/Gross half of the four-box grid,
// the only two boxes Rules.ManualEntry ever swaps for a `ManualCalcBox`.
const TareGrossBoxes = ({
    weights,
    captures,
    grossCaptures,
    manualTare,
    manualGross,
    onManualCapture,
    weightUnit,
    dateFmt,
    timeFmt,
    grossLabel,
    tareLabel,
    showGross,
    showTare,
}: TareGrossBoxesProps) => {
    const { t, lang } = useTranslation();
    // Gross first, Tare second — a loaded lorry weighing in before it's
    // unloaded is the common case, same order the mock's four-box grid now
    // reads left to right.
    return (
        <>
            {showGross &&
                (manualGross ? (
                    <ManualCalcBox
                        label={grossLabel}
                        onSubmit={(weightKg) => onManualCapture(weightKg, "Gross")}
                        weightUnit={weightUnit}
                    />
                ) : (
                    <CalcBox
                        label={grossLabel}
                        value={weights.grossKg !== null ? formatWeightIn(weights.grossKg, weightUnit) : "—"}
                        stamp={
                            formatStamp(grossCaptures[grossCaptures.length - 1]?.At, lang, dateFmt, timeFmt) +
                            (grossCaptures.length > 1
                                ? ` · ${grossCaptures.length} ${t("weigh.loadsSuffix")}`
                                : "")
                        }
                    />
                ))}
            {showTare &&
                (manualTare ? (
                    <ManualCalcBox
                        label={tareLabel}
                        onSubmit={(weightKg) => onManualCapture(weightKg, "Tare")}
                        weightUnit={weightUnit}
                    />
                ) : (
                    <CalcBox
                        label={tareLabel}
                        value={weights.tareKg !== null ? formatWeightIn(weights.tareKg, weightUnit) : "—"}
                        stamp={formatStamp(captures.find((c) => c.Type === "Tare")?.At, lang, dateFmt, timeFmt)}
                    />
                ))}
        </>
    );
};

export interface CalcCardProps {
    /** The active Schema — Gross/Tare/Net/Charge box labels resolve against it (falling back to the current i18n defaults) rather than being hardcoded. */
    ticketSchema: Schema;
    weights: DerivedWeights;
    captures: Capture[];
    /** Operator-entered, same field as challanNo — no auto-calc. */
    chargeValue: string;
    onChargeChange: (value: string) => void;
    materialRate: number | null;
    value: number | null;
    amountDp: 0 | 2;
    /** Settings → Weighing → Rules.ManualEntry — off leaves Tare/Gross exactly the read-only boxes they've always been. */
    manualEntry: boolean;
    /** `ticket.kind` — which of the two boxes (if either) is the one still waiting on a weight; still gates the physical capture button, but no longer alone gates manual entry (see `manualTare`/`manualGross` below). */
    kind: CaptureType | null;
    isLocked: boolean;
    /** `ticket.manualCapture` — same `pushCapture` pipeline the physical capture button uses, just `Source: "Manual"`; takes an explicit kind so both boxes can submit independently. */
    onManualCapture: (weightKg: number, kind: CaptureType) => void;
    /** Settings' `Formats.WeightUnit` — the Tare/Gross/Net boxes, formula and status pill all display in this unit. */
    weightUnit: WeightUnit;
    /** Settings' `Formats.DateFmt`/`TimeFmt` — the Tare/Gross capture stamps display in these. */
    dateFmt: string;
    timeFmt: "24" | "12";
}

// Split out of WeighingScreen (over the 300-line budget — docs/CodingStandards.md)
// — the "Captured & calculated" card: the mock's own `.calc` four-box grid
// (Tare/Gross/Net/Charge), the formula derivation underneath (CalcFormula),
// and the one-line status pill. Self-contained by design (the task that
// tracked this split named it "the cleanest candidate" for exactly that
// reason): only `ticket.weights`/`captures`, `charge`/`materialRate`/
// `value` and `Formats.AmountDp` — no master-cache or DataPort deps.
export const CalcCard = ({
    ticketSchema,
    weights,
    captures,
    chargeValue,
    onChargeChange,
    materialRate,
    value,
    amountDp,
    manualEntry,
    isLocked,
    onManualCapture,
    weightUnit,
    dateFmt,
    timeFmt,
}: CalcCardProps) => {
    const { t, lang } = useTranslation();
    const boxLabel = (fieldId: string, fallback: string) =>
        resolveFieldLabel(ticketSchema.Fields, fieldId, lang, fallback);
    // Task #46 — every Gross capture, in the order they were taken; length 1
    // covers today's single-gross ticket unchanged.
    const grossCaptures = captures.filter((c) => c.Type === "Gross");
    // Manual entry mode replaces a not-yet-captured Tare/Gross box with an
    // editable input. Gated on whether that type has been captured yet, not
    // on the ambient `kind` — `kind` goes null between captures (the
    // forced-save gate), but manual entry lets the operator fill in both
    // Tare and Gross without an intervening Save, so each box only needs to
    // know whether *it specifically* still needs a weight.
    const manualTare = manualEntry && !isLocked && !hasCapture(captures, "Tare");
    const manualGross = manualEntry && !isLocked && !hasCapture(captures, "Gross");
    const showGross = isBoxVisible(ticketSchema, "Gross");
    const showTare = isBoxVisible(ticketSchema, "Tare");
    const showNet = isBoxVisible(ticketSchema, "Net");
    const showCharge = isBoxVisible(ticketSchema, "Charge");
    const noBoxes = !showGross && !showTare && !showNet && !showCharge;
    return (
        <Card title={<span className="lbl">{t("weigh.capturedAndCalculated")}</span>}>
            {noBoxes && <p className={styles.emptySchema}>{t("weigh.capturedAndCalculated.empty")}</p>}
            <div className={styles.calc}>
                <TareGrossBoxes
                    weights={weights}
                    captures={captures}
                    grossCaptures={grossCaptures}
                    manualTare={manualTare}
                    manualGross={manualGross}
                    onManualCapture={onManualCapture}
                    weightUnit={weightUnit}
                    dateFmt={dateFmt}
                    timeFmt={timeFmt}
                    grossLabel={boxLabel("Gross", t("weigh.gross"))}
                    tareLabel={boxLabel("Tare", t("weigh.tare"))}
                    showGross={showGross}
                    showTare={showTare}
                />
                {showNet && (
                    <CalcBox
                        label={boxLabel("Net", t("weigh.net"))}
                        value={weights.netKg !== null ? formatWeightIn(weights.netKg, weightUnit) : "—"}
                        lead={weights.netKg !== null}
                    />
                )}
                {showCharge && (
                    <ChargeBox
                        label={boxLabel("Charge", t("weigh.charge"))}
                        value={chargeValue}
                        onChange={onChargeChange}
                        readOnly={isLocked}
                    />
                )}
            </div>
            <CalcFormula
                tareKg={weights.tareKg}
                grossKg={weights.grossKg}
                netKg={weights.netKg}
                materialRate={materialRate}
                value={value}
                amountDp={amountDp}
                grossWeightsKg={grossCaptures.map((c) => c.WeightKg)}
                weightUnit={weightUnit}
            />
            <StatusPill
                tareKg={weights.tareKg}
                grossKg={weights.grossKg}
                netKg={weights.netKg}
                weightUnit={weightUnit}
            />
        </Card>
    );
};
