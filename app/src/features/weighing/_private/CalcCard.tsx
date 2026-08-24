import type { ReactNode } from "react";

import { Card } from "@components/Card";
import { formatDateTimeInFmt, formatPlainNumber, formatWeightIn } from "@constants/numberFormat";
import type { WeightUnit } from "@constants/numberFormat";
import type { Capture, CaptureType } from "@db/ticketBody";
import type { DerivedWeights } from "@db/ticketBody";
import { hasCapture } from "@db/ticketBody";
import { resolveFieldIdLabel } from "@engines/schemaEngine";
import type { Field } from "@engines/schemaEngine";
import { resolveLocalized } from "@i18n/types";
import { useTranslation } from "@i18n/useTranslation";

import type { CalcFieldResults } from "./calcSegments";
import { getCalcItemsForFields } from "./calcSegments";
import { prettifyFormula } from "./formulaBreakdown";
import { ManualCalcBox } from "./ManualCalcBox";
import { evaluateFieldVisible } from "./schemaFieldValidation";
import { resolveFieldLabel } from "./ticketFieldIds";
import styles from "../_styles/WeighingScreen.module.css";

// Every box in this card — Gross/Tare included — only renders when its
// FieldId is actually present in *this segment's own* `fields` (WeighingLeftColumn
// passes each `"Calculated"` segment's own `Fields` here); a segment that
// omits Gross/Tare entirely (e.g. a minimal ticket type with no scale
// capture, or a second calc segment that only holds derived totals)
// genuinely has no such box, same as any other field a schema doesn't
// declare. `Visible: false` on a field that *is* present still just hides
// it (evaluateFieldVisible, same helper TicketFieldsCard/SchemaFieldRow
// use) rather than dropping it from the schema outright.
const isBoxVisible = (fields: Field[], fieldId: string): boolean => {
    const field = fields.find((candidate) => candidate.FieldId === fieldId);
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

// Task: "not below the segment, below every field, just show the
// calculation ... dont wrap it but you can truncate and show in hover incase
// it long" — one single-line, truncated formula ("Round(0 − (x))",
// "Gross − Tare") right under its own field's box, `title` carrying the full
// text for a long formula that got clipped. No label repeat (the box above
// already has its own label) and no substituted-value tail — just the
// calculation itself, same for every calc field including Net (no special
// treatment). `null` (a genuinely malformed formula) renders nothing.
const FormulaLine = ({ formula }: { formula: string | null }) =>
    formula ? (
        <div className={styles.formulaLine} title={formula}>
            {formula}
        </div>
    ) : null;

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

// This segment's own non-fixed calc-chain fields (getCalcItemsForFields,
// calcSegments.ts) — a plain row of read-only boxes under the fixed 4-box
// grid above, same visual language just without the stamp/lead/pending
// states those 4 have (a schema-driven `Formula` field has none of those
// concepts). A field whose formula threw (an input the operator hasn't
// filled in yet) shows "—", same as an unresolved Gross/Tare box. Renders
// nothing when this segment has no such fields (a `"Calculated"` segment
// that's only the fixed 4 boxes, e.g. the default schema's own
// `CapturedCalculated`).
const CalcSegmentRows = ({
    items,
    lang,
    t,
    showFormulaBreakdown,
}: {
    items: ReturnType<typeof getCalcItemsForFields>;
    lang: string;
    t: (key: string) => string;
    /** Settings → Weighing Rules' `ShowFormulaBreakdown` — off hides the raw formula lines below, keeping just the boxes. */
    showFormulaBreakdown: boolean;
}) => {
    if (items.length === 0) return null;
    return (
        <div className={styles.calcSegment}>
            <div className={styles.calcSegmentGrid}>
                {items.map(({ fieldId, field, formula, value }) => (
                    <div key={fieldId} className={styles.calcBoxWithFormula}>
                        <CalcBox
                            label={field.Label ? resolveLocalized(field.Label, lang) : resolveFieldIdLabel(fieldId, t)}
                            value={value !== undefined ? formatPlainNumber(value) : "—"}
                        />
                        {showFormulaBreakdown && <FormulaLine formula={prettifyFormula(formula)} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

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
                        value={weights.grossKg !== null ? formatWeightIn(weights.grossKg, weightUnit, lang) : "—"}
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
                        value={weights.tareKg !== null ? formatWeightIn(weights.tareKg, weightUnit, lang) : "—"}
                        stamp={formatStamp(captures.find((c) => c.Type === "Tare")?.At, lang, dateFmt, timeFmt)}
                    />
                ))}
        </>
    );
};

// Net is always `Gross - Tare` (buildTicketFormulaContext.ts's own rule) —
// the one fixed-box formula CalcCard owns outright rather than reading off a
// schema `Formula` field. A plain constant now: no substitution, no
// FormulaContext, so it needs neither `weights` nor a captured Gross/Tare to
// render — same `prettifyFormula` + `FormulaLine` pattern CalcSegmentRows
// uses for every schema-driven calc field, no special-casing (task: "make
// net also work that way no need for special treatment").
const NET_FORMULA = prettifyFormula("Gross - Tare");

interface NetChargeBoxesProps {
    weights: DerivedWeights;
    weightUnit: WeightUnit;
    showNet: boolean;
    showCharge: boolean;
    netLabel: string;
    chargeLabel: string;
    chargeValue: string;
    onChargeChange: (value: string) => void;
    isLocked: boolean;
    /** Settings → Weighing Rules' `ShowFormulaBreakdown` — off hides the Net box's raw formula line below it. */
    showFormulaBreakdown: boolean;
}

// Pulled out of CalcCard's own body (over the line budget —
// docs/CodingStandards.md) — the Net/Charge half of the four-box grid, plus
// Net's own raw formula line right under its box (Charge has no formula —
// it's a plain editable field, same as Challan No).
const NetChargeBoxes = ({
    weights,
    weightUnit,
    showNet,
    showCharge,
    netLabel,
    chargeLabel,
    chargeValue,
    onChargeChange,
    isLocked,
    showFormulaBreakdown,
}: NetChargeBoxesProps) => {
    const { lang } = useTranslation();
    return (
        <>
            {showNet && (
                <div className={styles.calcBoxWithFormula}>
                    <CalcBox
                        label={netLabel}
                        value={weights.netKg !== null ? formatWeightIn(weights.netKg, weightUnit, lang) : "—"}
                        lead={weights.netKg !== null}
                    />
                    {showFormulaBreakdown && <FormulaLine formula={NET_FORMULA} />}
                </div>
            )}
            {showCharge && (
                <ChargeBox label={chargeLabel} value={chargeValue} onChange={onChargeChange} readOnly={isLocked} />
            )}
        </>
    );
};

// Manual entry mode replaces a not-yet-captured Tare/Gross box with an
// editable input. Gated on whether that type has been captured yet, not
// on the ambient `kind` — `kind` goes null between captures (the
// forced-save gate), but manual entry lets the operator fill in both
// Tare and Gross without an intervening Save, so each box only needs to
// know whether *it specifically* still needs a weight. Pulled out of
// CalcCard purely to stay under the file's own line budget.
const isFieldManual = (fields: Field[], fieldId: string): boolean =>
    fields.find((candidate) => candidate.FieldId === fieldId)?.Manual === true;

const useCalcCardVisibility = (fields: Field[], captures: Capture[], manualEntry: boolean, isLocked: boolean) => {
    const manualTare = (manualEntry || isFieldManual(fields, "Tare")) && !isLocked && !hasCapture(captures, "Tare");
    const manualGross = (manualEntry || isFieldManual(fields, "Gross")) && !isLocked && !hasCapture(captures, "Gross");
    const showGross = isBoxVisible(fields, "Gross");
    const showTare = isBoxVisible(fields, "Tare");
    const showNet = isBoxVisible(fields, "Net");
    const showCharge = isBoxVisible(fields, "Charge");
    const noBoxes = !showGross && !showTare && !showNet && !showCharge;
    return { manualTare, manualGross, showGross, showTare, showNet, showCharge, noBoxes };
};

export interface CalcCardProps {
    /** This card's own title — one `FieldSegment`'s resolved Label (or its
     * i18n fallback), not a fixed "Captured & calculated" string, now that
     * WeighingLeftColumn renders one CalcCard per `"Calculated"` segment
     * (task: Godown's 2 bottom calculated cards). */
    title: ReactNode;
    /** One `FieldSegment.Fields` slice — just this card's own fields
     * (WeighingLeftColumn passes each `"Calculated"` segment's own `Fields`
     * here). Gross/Tare/Net/Charge box labels resolve against it, falling
     * back to the current i18n defaults; each of those 4 boxes only renders
     * when its FieldId is actually present here (`isBoxVisible`). */
    fields: Field[];
    weights: DerivedWeights;
    captures: Capture[];
    /** Operator-entered, same field as challanNo — no auto-calc. */
    chargeValue: string;
    onChargeChange: (value: string) => void;
    /** Settings → Weighing → Rules.ManualEntry — off leaves Tare/Gross exactly the read-only boxes they've always been. */
    manualEntry: boolean;
    /** Settings → Weighing → Rules.ShowFormulaBreakdown — off hides every raw formula line (Net box and schema-driven Formula fields alike), leaving just the boxes' own values. */
    showFormulaBreakdown: boolean;
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
    /** `useComputedCalcFields` (WeighingScreen.tsx) — the whole schema's values/breakdowns; this card picks its own segment's slice out via `getCalcItemsForFields`. Empty for a schema with none, same as `DEFAULT_TICKET_SCHEMA`'s today. */
    calcValues: CalcFieldResults;
}

// Split out of WeighingScreen (over the 300-line budget — docs/CodingStandards.md)
// — one "Calculated" segment's card: the fixed 4-box grid (Tare/Gross/Net/
// Charge, only for whichever of those this segment's own `fields` declare)
// plus this segment's own calc-chain rows. Every calculated box — the fixed
// Net box included (NetChargeBoxes' own `netFormulaBreakdown`) and each of
// this segment's schema-driven `Formula` fields (CalcSegmentRows) — shows
// its own substituted formula line right under it now; there is no longer a
// single once-per-ticket summary line (former `showSummary`/CalcFormula.tsx,
// removed — task: "show this per calculated field box"). Self-contained by
// design: only `ticket.weights`/`captures`/`charge` — no master-cache or
// DataPort deps.
interface CalcBoxGridProps {
    fields: Field[];
    weights: DerivedWeights;
    captures: Capture[];
    grossCaptures: Capture[];
    chargeValue: string;
    onChargeChange: (value: string) => void;
    manualEntry: boolean;
    isLocked: boolean;
    onManualCapture: TareGrossBoxesProps["onManualCapture"];
    weightUnit: WeightUnit;
    dateFmt: string;
    timeFmt: "24" | "12";
    boxLabel: (fieldId: string) => string;
    showFormulaBreakdown: boolean;
}

// The `.calc` four-box grid plus its "nothing to show" fallback message —
// pulled out of CalcCard purely to stay under the file's own line budget.
const CalcBoxGrid = ({
    fields,
    weights,
    captures,
    grossCaptures,
    chargeValue,
    onChargeChange,
    manualEntry,
    isLocked,
    onManualCapture,
    weightUnit,
    dateFmt,
    timeFmt,
    boxLabel,
    showFormulaBreakdown,
}: CalcBoxGridProps) => {
    const { manualTare, manualGross, showGross, showTare, showNet, showCharge } = useCalcCardVisibility(
        fields,
        captures,
        manualEntry,
        isLocked,
    );
    return (
        <>
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
                    grossLabel={boxLabel("Gross")}
                    tareLabel={boxLabel("Tare")}
                    showGross={showGross}
                    showTare={showTare}
                />
                <NetChargeBoxes
                    weights={weights}
                    weightUnit={weightUnit}
                    showNet={showNet}
                    showCharge={showCharge}
                    netLabel={boxLabel("Net")}
                    chargeLabel={boxLabel("Charge")}
                    chargeValue={chargeValue}
                    onChargeChange={onChargeChange}
                    isLocked={isLocked}
                    showFormulaBreakdown={showFormulaBreakdown}
                />
            </div>
        </>
    );
};

export const CalcCard = ({
    title,
    fields,
    weights,
    captures,
    chargeValue,
    onChargeChange,
    manualEntry,
    showFormulaBreakdown,
    isLocked,
    onManualCapture,
    weightUnit,
    dateFmt,
    timeFmt,
    calcValues,
}: CalcCardProps) => {
    const { t, lang } = useTranslation();
    const boxLabel = (fieldId: string) => resolveFieldLabel(fields, fieldId, lang, t);
    // Task #46 — every Gross capture, in the order they were taken; length 1
    // covers today's single-gross ticket unchanged.
    const grossCaptures = captures.filter((c) => c.Type === "Gross");
    const calcItems = getCalcItemsForFields(fields, calcValues);
    const { noBoxes } = useCalcCardVisibility(fields, captures, manualEntry, isLocked);
    return (
        <Card title={<span className="lbl">{title}</span>}>
            {noBoxes && calcItems.length === 0 && <p className={styles.emptySchema}>{t("weigh.capturedAndCalculated.empty")}</p>}
            <CalcBoxGrid
                fields={fields}
                weights={weights}
                captures={captures}
                grossCaptures={grossCaptures}
                chargeValue={chargeValue}
                onChargeChange={onChargeChange}
                manualEntry={manualEntry}
                isLocked={isLocked}
                onManualCapture={onManualCapture}
                weightUnit={weightUnit}
                dateFmt={dateFmt}
                timeFmt={timeFmt}
                boxLabel={boxLabel}
                showFormulaBreakdown={showFormulaBreakdown}
            />
            <CalcSegmentRows items={calcItems} lang={lang} t={t} showFormulaBreakdown={showFormulaBreakdown} />
        </Card>
    );
};
