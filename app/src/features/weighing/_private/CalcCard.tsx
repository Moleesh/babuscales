import { Card } from "@components/Card";
import { StatusPill } from "@components/StatusPill";
import { formatDateTime, formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { Capture, CaptureType } from "@db/ticketBody";
import type { DerivedWeights } from "@db/ticketBody";
import { useTranslation } from "@i18n/useTranslation";

import { CalcFormula } from "./CalcFormula";
import { ManualCalcBox } from "./ManualCalcBox";
import styles from "../_styles/WeighingScreen.module.css";

const formatStamp = (iso: string | undefined, lang: string): string =>
    iso ? formatDateTime(iso, lang) : "—";

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
    onManualCapture: (weightKg: number) => void;
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
}: TareGrossBoxesProps) => {
    const { t, lang } = useTranslation();
    return (
        <>
            {manualTare ? (
                <ManualCalcBox label={t("tare")} onSubmit={onManualCapture} />
            ) : (
                <CalcBox
                    label={t("tare")}
                    value={weights.tareKg !== null ? formatWeightKg(weights.tareKg) : "—"}
                    stamp={formatStamp(captures.find((c) => c.Type === "Tare")?.At, lang)}
                />
            )}
            {manualGross ? (
                <ManualCalcBox label={t("gross")} onSubmit={onManualCapture} />
            ) : (
                <CalcBox
                    label={t("gross")}
                    value={weights.grossKg !== null ? formatWeightKg(weights.grossKg) : "—"}
                    stamp={
                        formatStamp(grossCaptures[grossCaptures.length - 1]?.At, lang) +
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
    /** `ticket.kind` — which of the two boxes (if either) is the one still waiting on a weight; also gates the manual input the same way it already gates the physical capture button. */
    kind: CaptureType | null;
    isLocked: boolean;
    /** `ticket.manualCapture` — same `pushCapture` pipeline the physical capture button uses, just `Source: "Manual"`. */
    onManualCapture: (weightKg: number) => void;
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
    kind,
    isLocked,
    onManualCapture,
}: CalcCardProps) => {
    const { t } = useTranslation();
    // Task #46 — every Gross capture, in the order they were taken; length 1
    // covers today's single-gross ticket unchanged.
    const grossCaptures = captures.filter((c) => c.Type === "Gross");
    // Manual entry mode replaces a not-yet-captured Tare/Gross box with an
    // editable input — same gate (`kind`/`isLocked`) the physical capture
    // button already uses, so a manual entry can never race a scale one.
    const manualTare = manualEntry && !isLocked && kind === "Tare";
    const manualGross = manualEntry && !isLocked && kind === "Gross";
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
                />
                <CalcBox
                    label={t("net")}
                    value={weights.netKg !== null ? formatWeightKg(weights.netKg) : "—"}
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
            />
            <StatusPill tareKg={weights.tareKg} grossKg={weights.grossKg} netKg={weights.netKg} />
        </Card>
    );
};
