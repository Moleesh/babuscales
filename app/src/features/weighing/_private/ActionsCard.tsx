import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { SegmentedControl } from "@components/SegmentedControl";
import type { SegmentedOption } from "@components/SegmentedControl";
import type { CaptureType } from "@db/ticketBody";
import type { IndicatorReading } from "@engines/indicator";

import type { UseWeighingTicket } from "../useWeighingTicket";
import styles from "../WeighingScreen.module.css";

const KIND_OPTIONS: SegmentedOption<CaptureType>[] = [
    { value: "Tare", label: "Tare" },
    { value: "Gross", label: "Gross" },
];

// Task #46: with MultiGross on, a Gross that's already been captured once
// stays selectable (there's still exactly one Tare per ticket either way).
const kindOptionDisabled = (
    ticket: UseWeighingTicket,
    optionValue: CaptureType,
    multiGross: boolean,
): boolean =>
    (ticket.captures.some((c) => c.Type === optionValue) &&
        !(multiGross && optionValue === "Gross")) ||
    ticket.isLocked;

interface ActionsHintArgs {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    armed: boolean;
    gated: boolean;
    multiGross: boolean;
}

// The bottom-of-card status line — a straight run of "which situation are we
// in" checks rather than a nested ternary, so each case reads (and counts
// toward cognitive complexity) on its own instead of stacking with the ones
// around it. Args bundled into one object (rather than five positional
// params) to stay under the params budget too.
const actionsHint = ({ ticket, reading, armed, gated, multiGross }: ActionsHintArgs): string => {
    if (gated && !ticket.isLocked) {
        return "Licence needs attention — see the banner above. Activate in Settings → System to resume.";
    }
    if (ticket.isLocked) return ticket.printCount > 0 ? "Printed." : "Saved — ready to print.";
    if (ticket.isComplete) {
        return multiGross
            ? "Capture another Gross to add a load, or Save to finish this ticket."
            : "Both weights captured — Save to finish.";
    }
    if (reading.WeightKg === 0 && reading.Stable) return "Deck empty. Send a lorry to begin.";
    return armed ? "Stable — capture now." : "Weight in motion — capture is locked until it settles.";
};

// The three fixed button rows below the capture button — pulled out so the
// card's own body reads as "toggle, capture button, three rows, hint" at a
// glance instead of each row's markup inline.
const SaveAndPrintRow = ({
    ticket,
    gated,
    onSave,
    onOpenPrintModal,
}: Pick<ActionsCardProps, "ticket" | "gated" | "onSave" | "onOpenPrintModal">) => (
    <div className={styles.actions}>
        <Button
            disabled={ticket.isLocked || ticket.captures.length === 0 || ticket.saving || gated}
            onClick={onSave}
        >
            {ticket.isComplete ? "Save" : "Save & park"}
        </Button>
        <Button disabled={!ticket.isLocked || ticket.printCount > 0} onClick={onOpenPrintModal}>
            Print
        </Button>
    </div>
);

const ReprintRow = ({
    ticket,
    onOpenPrintModal,
}: Pick<ActionsCardProps, "ticket" | "onOpenPrintModal">) => (
    <div className={styles.actions}>
        <Button disabled={ticket.printCount === 0} onClick={onOpenPrintModal}>
            Reprint
        </Button>
        <Button onClick={ticket.startNew}>New ticket</Button>
    </div>
);

const ClearAndSendRow = ({
    ticket,
    loadLorry,
}: Pick<ActionsCardProps, "ticket" | "loadLorry">) => (
    <div className={styles.actions}>
        <Button variant="danger" disabled={ticket.isLocked} onClick={ticket.clear}>
            Clear
        </Button>
        {loadLorry && (
            <Button
                // Task #46: `!ticket.kind` alone is the correct gate now — `defaultCaptureKind`
                // already returns null exactly when nothing more should be captured (the old
                // `captures.length >= 2` check would have blocked a second Gross under
                // MultiGross even though `kind` still offers one).
                disabled={ticket.isLocked || !ticket.kind}
                onClick={() => ticket.kind && loadLorry(ticket.kind)}
            >
                Send a lorry
            </Button>
        )}
    </div>
);

export interface ActionsCardProps {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    /** `IndicatorSource.loadLorry` — undefined on a real serial adapter, present only on the simulated one (demo/dev). */
    loadLorry: ((kind: CaptureType) => void) | undefined;
    /** Settings → Weighing → Rules.MultiGross (task #46) — whether the "Capture as" toggle keeps offering Gross once a Tare+Gross pair already exists. */
    multiGross: boolean;
    armed: boolean;
    /** `useLicense().isGated` — blocks Save (a new row hitting the DB) in addition to `armed` already blocking capture; see WeighingScreen's own `licenseGated` prop comment for why Print/Reprint of an already-saved ticket stays open. */
    gated: boolean;
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
    multiGross,
    armed,
    gated,
    captureLabel,
    captureHint,
    onSave,
    onOpenPrintModal,
}: ActionsCardProps) => (
    <Card
        title={<span className="lbl">Actions</span>}
        headerRight={<span className="chip num">{ticket.printCount} prints</span>}
    >
        <div style={{ display: "grid", gap: 9 }}>
            <SegmentedControl
                options={KIND_OPTIONS.map((option) => ({
                    ...option,
                    disabled: kindOptionDisabled(ticket, option.value, multiGross),
                }))}
                value={ticket.kind ?? "Tare"}
                onChange={ticket.setKind}
                size="big"
                ariaLabel="Capture as"
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
                onSave={onSave}
                onOpenPrintModal={onOpenPrintModal}
            />
            <ReprintRow ticket={ticket} onOpenPrintModal={onOpenPrintModal} />
            <ClearAndSendRow ticket={ticket} loadLorry={loadLorry} />
            <p className={styles.hint}>
                {actionsHint({ ticket, reading, armed, gated, multiGross })}
            </p>
        </div>
    </Card>
);
