import { Card } from "@components/Card";
import { StatusPill } from "@components/StatusPill";
import { formatDateTimeInFmt, formatMoney, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import type { Capture, CaptureType } from "@db/ticketBody";
import type { DerivedWeights } from "@db/ticketBody";
import { hasCapture } from "@db/ticketBody";
import { useTranslation } from "@i18n/useTranslation";

import { CalcFormula } from "./CalcFormula";
import { ManualCalcBox } from "./ManualCalcBox";
import styles from "../_styles/WeighingScreen.module.css";

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
}: TareGrossBoxesProps) => {
    const { t, lang } = useTranslation();
    return (
        <>
            {manualTare ? (
                <ManualCalcBox label={t("tare")} onSubmit={(weightKg) => onManualCapture(weightKg, "Tare")} />
            ) : (
                <CalcBox
                    label={t("tare")}
                    value={weights.tareKg !== null ? formatWeightIn(weights.tareKg, weightUnit) : "—"}
                    stamp={formatStamp(captures.find((c) => c.Type === "Tare")?.At, lang, dateFmt, timeFmt)}
                />
            )}
            {manualGross ? (
                <ManualCalcBox label={t("gross")} onSubmit={(weightKg) => onManualCapture(weightKg, "Gross")} />
            ) : (
                <CalcBox
                    label={t("gross")}
                    value={weights.grossKg !== null ? formatWeightIn(weights.grossKg, weightUnit) : "—"}
                    stamp={
                        formatStamp(grossCaptures[grossCaptures.length - 1]?.At, lang, dateFmt, timeFmt) +
                        (grossCaptures.length > 1
                            ? ` · ${grossCaptures.length} ${t("weigh.loadsSuffix")}`
                            : "")
                    }
                />
            )}
        </>
    );
};

export interface CalcCardProps {
    weights: DerivedWeights;
    captures: Capture[];
    charge: number | null;
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
    weights,
    captures,
    charge,
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
    const { t } = useTranslation();
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
    return (
        <Card title={<span className="lbl">{t("weigh.capturedAndCalculated")}</span>}>
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
                />
                <CalcBox
                    label={t("net")}
                    value={weights.netKg !== null ? formatWeightIn(weights.netKg, weightUnit) : "—"}
                    lead={weights.netKg !== null}
                />
                <CalcBox
                    label={t("charge")}
                    value={charge === null ? "—" : formatMoney(charge, amountDp)}
                    pending={charge === null}
                />
            </div>
            <CalcFormula
                tareKg={weights.tareKg}
                grossKg={weights.grossKg}
                netKg={weights.netKg}
                charge={charge}
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
