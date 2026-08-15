import { formatMoney, formatWeightIn, INDIAN_LOCALE } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";

import styles from "../_styles/WeighingScreen.module.css";

export interface CalcFormulaProps {
    tareKg: number | null;
    grossKg: number | null;
    netKg: number | null;
    materialRate: number | null;
    value: number | null;
    amountDp: 0 | 2;
    /** The ticket's Gross capture weight, as a length-1 (or length-0, before it's captured) array — kept as an array so the formula's own reduce over it stays simple. */
    grossWeightsKg: number[];
    /** Settings' `Formats.WeightUnit` — every weight in this derivation renders in it. */
    weightUnit: WeightUnit;
}

// Ported from the mock's own `#formula` derivation text (demo/BabuScales-demo.html's
// `renderCalc()`) — sits under the calc grid, not a fifth box in it (the
// grid stays Tare/Gross/Net/Charge, exactly as the mock's own `.calc` does).
// Net and Charge lines show once both weights are in, matching the mock's
// `c.net == null ? "" : ...` gate; the Value line only appears once a
// Material with a real Rate is also selected — most tickets never show it.
export const CalcFormula = ({
    tareKg,
    grossKg,
    netKg,
    materialRate,
    value,
    amountDp,
    grossWeightsKg,
    weightUnit,
}: CalcFormulaProps) => {
    if (netKg === null || tareKg === null || grossKg === null) return null;
    // `netKg` is always `grossKg - tareKg`, clamped to 0 — never swapped,
    // never absolute-valued (task: "Net formula is always gross - tare, and
    // if the calculation is less than 0 we show zero no need to swap"). So
    // the displayed subtraction always reads Gross − Tare too, even for a
    // ticket that nets to 0.
    // `formatWeightIn` already appends the unit itself, so the formula's
    // own literal " kg" suffixes are gone below.
    const netLine =
        grossWeightsKg.length > 1 ? (
            <span>
                Net = Σ(Gross − Tare) over {grossWeightsKg.length} loads ={" "}
                <em>
                    {grossWeightsKg
                        .map((g) => formatWeightIn(Math.max(0, g - tareKg), weightUnit))
                        .join(" + ")}{" "}
                    = {formatWeightIn(netKg, weightUnit)}
                </em>
            </span>
        ) : (
            <span>
                Net = Gross − Tare ={" "}
                <em>
                    {formatWeightIn(grossKg, weightUnit)} − {formatWeightIn(tareKg, weightUnit)} ={" "}
                    {formatWeightIn(netKg, weightUnit)}
                </em>
            </span>
        );
    return (
        <div className={styles.formula}>
            {netLine}
            {value !== null && materialRate !== null && (
                <span>
                    Value = Round(Net / 1000 × Material.Rate, 0) ={" "}
                    <em>
                        {(netKg / 1000).toFixed(3)} × ₹{materialRate.toLocaleString(INDIAN_LOCALE)}{" "}
                        = {formatMoney(value, amountDp)}
                    </em>
                </span>
            )}
        </div>
    );
};
