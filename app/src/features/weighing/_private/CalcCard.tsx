import { Card } from "@components/Card";
import { StatusPill } from "@components/StatusPill";
import { formatMoney, formatWeightKg } from "@constants/numberFormat";
import type { Capture } from "@db/ticketBody";
import type { DerivedWeights } from "@db/ticketBody";

import { CalcFormula } from "./CalcFormula";
import styles from "../WeighingScreen.module.css";

const formatStamp = (iso: string | undefined): string =>
    iso ? new Date(iso).toLocaleString() : "—";

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
                <CalcBox
                    label="Tare"
                    value={weights.tareKg !== null ? formatWeightKg(weights.tareKg) : "—"}
                    stamp={formatStamp(captures.find((c) => c.Type === "Tare")?.At)}
                />
                <CalcBox
                    label="Gross"
                    value={weights.grossKg !== null ? formatWeightKg(weights.grossKg) : "—"}
                    stamp={
                        formatStamp(grossCaptures[grossCaptures.length - 1]?.At) +
                        (grossCaptures.length > 1 ? ` · ${grossCaptures.length} loads` : "")
                    }
                />
                <CalcBox
                    label="Net"
                    value={weights.netKg !== null ? formatWeightKg(weights.netKg) : "—"}
                    lead={weights.netKg !== null}
                />
                <CalcBox
                    label="Charge"
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
