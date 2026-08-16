import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { CaptureType } from "@db/ticketBody";
import type { IndicatorReading } from "@engines/indicator";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import type { UseWeighingTicket } from "../useWeighingTicket";

const kindOptions = (t: ReturnType<typeof useTranslation>["t"]): SegmentedOption<CaptureType>[] => [
    { value: "Tare", label: t("weigh.tare") },
    { value: "Gross", label: t("weigh.gross") },
];

// Exactly one Tare and one Gross per ticket — once a kind is captured it's
// no longer selectable. `ticket.kind === null` also covers the
// awaiting-save moment right after any capture (useWeighingTicket's
// `awaitingSave`): the toggle must not offer the still-open kind either,
// or picking it would bypass the forced Save between captures.
const kindOptionDisabled = (ticket: UseWeighingTicket, optionValue: CaptureType): boolean =>
    ticket.captures.some((c) => c.Type === optionValue) || ticket.isLocked || ticket.kind === null;

interface ActionsHintArgs {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    armed: boolean;
    gated: boolean;
    t: ReturnType<typeof useTranslation>["t"];
}

// The bottom-of-card status line — a straight run of "which situation are we
// in" checks rather than a nested ternary, so each case reads (and counts
// toward cognitive complexity) on its own instead of stacking with the ones
// around it. Args bundled into one object (rather than five positional
// params) to stay under the params budget too.
const actionsHint = ({ ticket, reading, armed, gated, t }: ActionsHintArgs): string => {
    if (gated && !ticket.isLocked) {
        return t("weigh.licenceHint");
    }
    if (ticket.isLocked) return ticket.printCount > 0 ? t("weigh.printed") : t("weigh.savedReadyToPrint");
    if (ticket.isComplete) return t("weigh.bothWeightsCaptured");
    // Awaiting-save: a capture just landed and `kind` was nulled to force a
    // Save before the next one — distinct from `isComplete` (both weights
    // in) and from the ordinary "nothing on the deck yet" hints below.
    if (!ticket.kind && ticket.captures.length > 0) return t("weigh.awaitingSave");
    // A single-weight save that's stayed on screen — already in the DB and
    // printable, just not `isLocked` yet since the second weight hasn't
    // landed. Checked after the awaitingSave branch above so a capture that
    // hasn't been saved even once yet still gets that hint instead.
    if (ticket.docId !== null && !ticket.isComplete) return t("weigh.savedReadyToPrint");
    if (reading.WeightKg === 0 && reading.Stable) return t("weigh.deckEmpty");
    return armed ? t("weigh.stableCaptureNow") : t("weigh.weightInMotion");
};

// The three fixed button rows below the capture button — pulled out so the
// card's own body reads as "toggle, capture button, three rows, hint" at a
// glance instead of each row's markup inline.
const SaveAndPrintRow = ({
    ticket,
    gated,
    hasBlockingCustomFieldError,
    onSave,
    onOpenPrintModal,
}: Pick<
    ActionsCardProps,
    "ticket" | "gated" | "hasBlockingCustomFieldError" | "onSave" | "onOpenPrintModal"
>) => {
    const { t } = useTranslation();
    return (
        <div className={styles.actions}>
            <Button
                disabled={
                    ticket.isLocked ||
                    ticket.captures.length === 0 ||
                    ticket.saving ||
                    gated ||
                    hasBlockingCustomFieldError
                }
                onClick={onSave}
            >
                {ticket.isComplete ? t("weigh.save") : t("weigh.saveAndPark")}
            </Button>
            {/* `docId` rather than `isLocked` — a single-weight save stays on
                screen already persisted, and should be printable just like a
                complete/locked one. */}
            <Button disabled={!ticket.docId || ticket.printCount > 0} onClick={onOpenPrintModal}>
                {t("weigh.print")}
            </Button>
        </div>
    );
};

const ReprintRow = ({
    ticket,
    onOpenPrintModal,
}: Pick<ActionsCardProps, "ticket" | "onOpenPrintModal">) => {
    const { t } = useTranslation();
    return (
        <div className={styles.actions}>
            <Button disabled={ticket.printCount === 0} onClick={onOpenPrintModal}>
                {t("weigh.reprint")}
            </Button>
            <Button onClick={ticket.startNew}>{t("weigh.newTicket")}</Button>
        </div>
    );
};

// "Clear" used to live here alongside "Send to lorry" — a `danger`-styled
// discard button, separate from ReprintRow's "New ticket" (which parks any
// in-progress captures instead of discarding them). Removed: with no
// captures yet — the overwhelmingly common moment either gets clicked —
// both just reset the empty form, so the two read as one button doing the
// same thing twice. "New ticket" is the one kept: its
// park-in-progress-work behaviour is a strict superset of what "Clear" did.
const SendLorryRow = ({ ticket, loadLorry }: Pick<ActionsCardProps, "ticket" | "loadLorry">) => {
    const { t } = useTranslation();
    if (!loadLorry) return null;
    return (
        <div className={styles.actions}>
            <Button
                // `!ticket.kind` alone is the correct gate — `defaultCaptureKind`
                // returns null once both Tare and Gross have been captured.
                disabled={ticket.isLocked || !ticket.kind}
                onClick={() => ticket.kind && loadLorry(ticket.kind)}
            >
                {t("weigh.sendLorry")}
            </Button>
        </div>
    );
};

export interface ActionsCardProps {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    /** `IndicatorSource.loadLorry` — undefined on a real serial adapter, present only on the simulated one (demo/dev). */
    loadLorry: ((kind: CaptureType) => void) | undefined;
    armed: boolean;
    /** `useLicense().isGated` — blocks Save (a new row hitting the DB) in addition to `armed` already blocking capture; see WeighingScreen's own `licenseGated` prop comment for why Print/Reprint of an already-saved ticket stays open. */
    gated: boolean;
    /** A custom Field's Block-severity Validate rule is currently failing — blocks Save the same way `gated` does. Computed in WeighingScreen, threaded through WeighingRightColumn. */
    hasBlockingCustomFieldError: boolean;
    captureLabel: string;
    captureHint: string;
    onSave: () => void;
    onOpenPrintModal: () => void;
}

// Split out of WeighingScreen (over the 300-line budget — docs/CodingStandards.md)
// — the mock's own `.actions` button stack: capture-as toggle, the big
// capture button, Save/Print, Reprint/New ticket, Clear/Send a lorry, and
// the one-line status hint at the bottom.
export const ActionsCard = ({
    ticket,
    reading,
    loadLorry,
    armed,
    gated,
    hasBlockingCustomFieldError,
    captureLabel,
    captureHint,
    onSave,
    onOpenPrintModal,
}: ActionsCardProps) => {
    const { t } = useTranslation();
    return (
        <Card
            title={<span className="lbl">{t("weigh.actions")}</span>}
            headerRight={
                <span className="chip num">
                    {ticket.printCount} {t("weigh.printsSuffix")}
                </span>
            }
        >
            <div style={{ display: "grid", gap: 9 }}>
                <SegmentedControl
                    options={kindOptions(t).map((option) => ({
                        ...option,
                        disabled: kindOptionDisabled(ticket, option.value),
                    }))}
                    value={ticket.kind ?? "Tare"}
                    onChange={ticket.setKind}
                    size="big"
                    ariaLabel={t("weigh.captureAs")}
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
                <SaveAndPrintRow
                    ticket={ticket}
                    gated={gated}
                    hasBlockingCustomFieldError={hasBlockingCustomFieldError}
                    onSave={onSave}
                    onOpenPrintModal={onOpenPrintModal}
                />
                <ReprintRow ticket={ticket} onOpenPrintModal={onOpenPrintModal} />
                <SendLorryRow ticket={ticket} loadLorry={loadLorry} />
                <p className={styles.hint}>
                    {actionsHint({ ticket, reading, armed, gated, t })}
                </p>
            </div>
        </Card>
    );
};
