import { formatMoney, formatWeightKg, INDIAN_LOCALE } from "@constants/numberFormat";
import { GROSS_CHARGE_INR, TARE_CHARGE_INR } from "@engines/billing";

import styles from "../WeighingScreen.module.css";

export interface CalcFormulaProps {
    tareKg: number | null;
    grossKg: number | null;
    netKg: number | null;
    charge: number | null;
    materialRate: number | null;
    value: number | null;
    amountDp: 0 | 2;
}

// Ported from the mock's own `#formula` derivation text (demo/BabuScale-demo.html's
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
}: CalcFormulaProps) => {
    if (netKg === null || tareKg === null || grossKg === null) return null;
    return (
        <div className={styles.formula}>
            <span>
                Net = Gross − Tare ={" "}
                <em>
                    {formatWeightKg(grossKg)} − {formatWeightKg(tareKg)} = {formatWeightKg(netKg)}{" "}
                    kg
                </em>
            </span>
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
