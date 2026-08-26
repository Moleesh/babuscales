import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import { StatusPill } from "@components/StatusPill";
import type { WeightUnit } from "@constants/numberFormat";
import type { CaptureType } from "@db/ticketBody";
import type { IndicatorReading } from "@engines/indicator";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { focusFirstTicketField } from "./focusFirstTicketField";

const kindOptions = (t: ReturnType<typeof useTranslation>["t"]): SegmentedOption<CaptureType>[] => [
    { value: "Tare", label: t("weigh.label.tare") },
    { value: "Gross", label: t("weigh.label.gross") },
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
    forcePrintEnabled,
}: Pick<
    ActionsCardProps,
    | "ticket"
    | "gated"
    | "hasBlockingCustomFieldError"
    | "onSave"
    | "onOpenPrintModal"
    | "forcePrintEnabled"
>) => {
    const { t } = useTranslation();
    // `docId` rather than `isLocked` — a single-weight save stays on screen
    // already persisted, and should be printable just like a
    // complete/locked one. `forcePrintEnabled` — a Reprint lookup just
    // resumed+locked an already-printed ticket into the deck (task: "reprint
    // should enable print and focus it") — bypasses the normal
    // `printCount === 0` gate for that one ticket, same as any other
    // already-printed ticket wouldn't otherwise be re-printable from here.
    // `!ticket.justResumed` — task: "resume on opening ticket should disable
    // save and print" — a freshly-resumed single-weight ticket hasn't been
    // acted on yet this sitting, so it doesn't read as already
    // save/print-ready until the operator captures the second weight.
    // `!ticket.awaitingSave` — task: "for second weight as soon as the
    // capture is done both save and print popup only save should be
    // enabled" — the instant the second capture lands, `awaitingSave` goes
    // true and the ticket already has a `docId` from its first-weight save,
    // so without this the Print button lit up right alongside Save even
    // though nothing from *this* capture has been persisted yet. Only Save
    // should be actionable until that save actually happens.
    const printEnabled =
        Boolean(ticket.docId) &&
        (ticket.printCount === 0 || forcePrintEnabled) &&
        !ticket.justResumed &&
        !ticket.awaitingSave;
    return (
        <div className={styles.actions}>
            <Button
                id="actionsSaveBtn"
                disabled={
                    ticket.isLocked ||
                    ticket.captures.length === 0 ||
                    ticket.saving ||
                    gated ||
                    hasBlockingCustomFieldError ||
                    // Task: "in case of reprint save and capture is disabled
                    // only print is available" — a reprint resumes an
                    // already-saved, already-printed ticket purely to print
                    // it again; re-saving it (or the capture button below)
                    // has no business being live during that window.
                    forcePrintEnabled ||
                    // Task: "resume on opening ticket should disable save
                    // and print, save will be disabled until we capture the
                    // second weight" — see ticket.justResumed's own comment.
                    ticket.justResumed
                }
                onClick={onSave}
            >
                {t("weigh.save")}
            </Button>
            <Button id="actionsPrintBtn" disabled={!printEnabled} onClick={onOpenPrintModal}>
                {t("weigh.print")}
            </Button>
        </div>
    );
};

// Reprint used to gate on `printCount > 0` (nothing to reprint yet), but
// that left it disabled right alongside Print for most of a ticket's life.
// Task: "reprint should be most avalible unless print is enabled" — it's
// now open by default and only steps aside for Print's own moment (first
// print, not yet taken) so the two buttons are never both live at once.
const ReprintRow = ({
    ticket,
    onOpenReprintLookup,
}: Pick<ActionsCardProps, "ticket" | "onOpenReprintLookup">) => {
    const { t } = useTranslation();
    const printEnabled = Boolean(ticket.docId) && ticket.printCount === 0;
    // Task: "after capture disable the reprint until we save is completed" —
    // `printEnabled` above only catches the *saved-and-not-yet-printed*
    // window; a capture just taken (first weight, still `docId === null`, or
    // second weight, `awaitingSave`) hasn't been persisted at all yet, so
    // Reprint — which looks up an already-saved ticket by number — has
    // nothing valid to act on for *this* ticket until that save lands.
    const hasUnsavedCapture = ticket.captures.length > 0 && (ticket.docId === null || ticket.awaitingSave);
    const reprintDisabled = printEnabled || hasUnsavedCapture;
    return (
        // `data-enter-skip` — task: "these three buttons should not be
        // focusable" (Reprint/New ticket/Send a lorry) — same fix as
        // OpenTicketStrip's own resume buttons: excluded from the Enter-walk
        // as both source and destination (useEnterAsTab.ts), still fully
        // clickable by mouse.
        <div className={styles.actions} data-enter-skip>
            <Button disabled={reprintDisabled} onClick={onOpenReprintLookup}>
                {t("weigh.reprint")}
            </Button>
            <Button
                onClick={() => {
                    // Task: "on close of print dialog box the ticket need to
                    // reset to new ticket, focusing on the first field in the
                    // list same for new ticket".
                    ticket.startNew();
                    focusFirstTicketField();
                }}
            >
                {t("weigh.newTicket")}
            </Button>
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
        // `data-enter-skip` — see ReprintRow's own comment above.
        <div className={styles.actions} data-enter-skip>
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
    /** Opens the "enter a ticket no" prompt (ReprintLookupModal) — Reprint no
     * longer reprints whatever's currently on the deck, it looks up any
     * saved ticket by number first (task: "reprint first bring a pop to
     * enter the ticket no adn tehn fetches it to for print"). */
    onOpenReprintLookup: () => void;
    /** Settings' `Formats.WeightUnit` — the Tare/Gross/Net status pill (moved
     * here from CalcCard, task: "move the tare gross,net below the
     * capture") renders in it, same as everywhere else weight appears. */
    weightUnit: WeightUnit;
    /** WeighingScreen's `useReprintFlow` — true right after a Reprint lookup
     * resumes+locks a found ticket, overriding SaveAndPrintRow's normal
     * `printCount === 0` gate (task: "reprint should enable print and focus
     * it"). */
    forcePrintEnabled: boolean;
}

// "0 prints" read as unclear (task #18) — an unprinted ticket now says so
// plainly instead of a bare zero-count chip.
const printCountLabel = (printCount: number, t: (key: string) => string): string =>
    printCount > 0 ? `${printCount} ${t("weigh.printsSuffix")}` : t("weigh.notPrintedYet");

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
    onOpenReprintLookup,
    weightUnit,
    forcePrintEnabled,
}: ActionsCardProps) => {
    const { t, lang } = useTranslation();
    const headerRight = <span className="chip num">{printCountLabel(ticket.printCount, t)}</span>;
    return (
        <Card title={<span className="lbl">{t("weigh.actions")}</span>} headerRight={headerRight}>
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
                    id="actionsCaptureBtn"
                    variant={ticket.isComplete ? "complete" : "primary"}
                    size="large"
                    // `forcePrintEnabled` — see SaveAndPrintRow's own comment:
                    // a reprint's whole point is re-printing an already-saved
                    // ticket, not capturing a fresh weight into it.
                    disabled={!armed || forcePrintEnabled}
                    caption={captureHint}
                    onClick={() => {
                        ticket.capture(reading.WeightKg);
                        // Task: "enter in capture should capture and move
                        // focus to save, which will get enabled after the
                        // capture event is done" — `capture` is a synchronous
                        // dispatch, but React hasn't re-rendered yet at this
                        // point in the click handler, so Save's `disabled`
                        // attribute (SaveAndPrintRow's own
                        // `ticket.captures.length === 0` check) is still
                        // stale here; focusing it immediately would silently
                        // no-op on a still-disabled button. Deferring one
                        // frame gives the capture's re-render (and thus
                        // Save's real, now-enabled DOM state) time to land
                        // first.
                        requestAnimationFrame(() => document.getElementById("actionsSaveBtn")?.focus());
                    }}
                >
                    {captureLabel}
                </Button>
                <StatusPill
                    tareKg={ticket.weights.tareKg}
                    grossKg={ticket.weights.grossKg}
                    netKg={ticket.weights.netKg}
                    hideNet
                    weightUnit={weightUnit}
                    lang={lang}
                    labels={{ tare: t("weigh.label.tare"), gross: t("weigh.label.gross"), net: t("weigh.label.net") }}
                />
                <SaveAndPrintRow
                    ticket={ticket}
                    gated={gated}
                    hasBlockingCustomFieldError={hasBlockingCustomFieldError}
                    onSave={onSave}
                    onOpenPrintModal={onOpenPrintModal}
                    forcePrintEnabled={forcePrintEnabled}
                />
                <ReprintRow ticket={ticket} onOpenReprintLookup={onOpenReprintLookup} />
                <SendLorryRow ticket={ticket} loadLorry={loadLorry} />
                <p className={styles.hint}>{actionsHint({ ticket, reading, armed, gated, t })}</p>
            </div>
        </Card>
    );
};
