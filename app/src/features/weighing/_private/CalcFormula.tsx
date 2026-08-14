import { formatMoney, formatWeightIn, INDIAN_LOCALE } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import { GROSS_CHARGE_INR, TARE_CHARGE_INR } from "@engines/billing";

import styles from "../_styles/WeighingScreen.module.css";

export interface CalcFormulaProps {
    tareKg: number | null;
    grossKg: number | null;
    netKg: number | null;
    charge: number | null;
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
    charge,
    materialRate,
    value,
    amountDp,
    grossWeightsKg,
    weightUnit,
}: CalcFormulaProps) => {
    if (netKg === null || tareKg === null || grossKg === null) return null;
    // `netKg` is always `grossKg - tareKg` (via `Math.abs`) — a ticket has
    // exactly one Tare and one Gross, so `grossWeightsKg` is length 1 here.
    // `formatWeightIn` already appends the unit itself, so the formula's
    // own literal " kg" suffixes are gone below.
    const netLine =
        grossWeightsKg.length > 1 ? (
            <span>
                Net = Σ(Gross − Tare) over {grossWeightsKg.length} loads ={" "}
                <em>
                    {grossWeightsKg
                        .map((g) => formatWeightIn(Math.abs(g - tareKg), weightUnit))
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
            <span>
                Charge = Type.TareCharge + Type.GrossCharge ={" "}
                <em>
                    {formatMoney(TARE_CHARGE_INR, amountDp)} +{" "}
                    {formatMoney(GROSS_CHARGE_INR, amountDp)} ={" "}
                    {charge !== null ? formatMoney(charge, amountDp) : "—"}
                </em>
            </span>
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
