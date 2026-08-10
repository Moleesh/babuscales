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

export interface ActionsCardProps {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    /** `IndicatorSource.loadLorry` — undefined on a real serial adapter, present only on the simulated one (demo/dev). */
    loadLorry: ((kind: CaptureType) => void) | undefined;
    armed: boolean;
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
                    disabled:
                        ticket.captures.some((c) => c.Type === option.value) || ticket.isLocked,
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
            <div className={styles.actions}>
                <Button
                    disabled={ticket.isLocked || ticket.captures.length === 0 || ticket.saving}
                    onClick={onSave}
                >
                    {ticket.isComplete ? "Save" : "Save & park"}
                </Button>
                <Button
                    disabled={!ticket.isLocked || ticket.printCount > 0}
                    onClick={onOpenPrintModal}
                >
                    Print
                </Button>
            </div>
            <div className={styles.actions}>
                <Button disabled={ticket.printCount === 0} onClick={onOpenPrintModal}>
                    Reprint
                </Button>
                <Button onClick={ticket.startNew}>New ticket</Button>
            </div>
            <div className={styles.actions}>
                <Button variant="danger" disabled={ticket.isLocked} onClick={ticket.clear}>
                    Clear
                </Button>
                {loadLorry && (
                    <Button
                        disabled={ticket.captures.length >= 2 || ticket.isLocked || !ticket.kind}
                        onClick={() => ticket.kind && loadLorry(ticket.kind)}
                    >
                        Send a lorry
                    </Button>
                )}
            </div>
            <p className={styles.hint}>
                {ticket.isLocked
                    ? ticket.printCount > 0
                        ? "Printed."
                        : "Saved — ready to print."
                    : ticket.isComplete
                      ? "Both weights captured — Save to finish."
                      : reading.WeightKg === 0 && reading.Stable
                        ? "Deck empty. Send a lorry to begin."
                        : armed
                          ? "Stable — capture now."
                          : "Weight in motion — capture is locked until it settles."}
            </p>
        </div>
    </Card>
);
