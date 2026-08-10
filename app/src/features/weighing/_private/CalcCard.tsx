import { Card } from "@components/Card";
import { StatusPill } from "@components/StatusPill";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { Capture } from "@db/ticketBody";
import type { DerivedWeights } from "@db/ticketBody";

import { CalcFormula } from "./CalcFormula";
import styles from "../WeighingScreen.module.css";

const formatStamp = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleString() : "—";

export interface CalcCardProps {
    weights: DerivedWeights;
    captures: Capture[];
    charge: number | null;
    materialRate: number | null;
    value: number | null;
    amountDp: 0 | 2;
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
}: CalcCardProps) => {
    // Task #46 — every Gross capture, in the order they were taken; length 1
    // covers today's single-gross ticket unchanged.
    const grossCaptures = captures.filter((c) => c.Type === "Gross");
    return (
        <Card title={<span className="lbl">Captured &amp; calculated</span>}>
            <div className={styles.calc}>
                <div className={styles.calcBox}>
                    <span className="lbl">Tare</span>
                    <b className={styles.calcValue}>
                        {weights.tareKg !== null ? formatWeightKg(weights.tareKg) : "—"}
                    </b>
                    <div className={styles.calcStamp}>
                        {formatStamp(captures.find((c) => c.Type === "Tare")?.At)}
                    </div>
                </div>
                <div className={styles.calcBox}>
                    <span className="lbl">Gross</span>
                    <b className={styles.calcValue}>
                        {weights.grossKg !== null ? formatWeightKg(weights.grossKg) : "—"}
                    </b>
                    <div className={styles.calcStamp}>
                        {formatStamp(grossCaptures[grossCaptures.length - 1]?.At)}
                        {grossCaptures.length > 1 ? ` · ${grossCaptures.length} loads` : ""}
                    </div>
                </div>
                <div
                    className={`${styles.calcBox} ${weights.netKg !== null ? styles.calcLead : ""}`}
                >
                    <span className="lbl">Net</span>
                    <b className={styles.calcValue}>
                        {weights.netKg !== null ? formatWeightKg(weights.netKg) : "—"}
                    </b>
                    <div className={styles.calcStamp}>&nbsp;</div>
                </div>
                <div className={`${styles.calcBox} ${charge === null ? styles.calcPending : ""}`}>
                    <span className="lbl">Charge</span>
                    <b className={styles.calcValue}>
                        {charge === null ? "—" : formatMoney(charge, amountDp)}
                    </b>
                    <div className={styles.calcStamp}>&nbsp;</div>
                </div>
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
