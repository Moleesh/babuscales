import { useState } from "react";

export interface UseTicketNumberReset {
    confirmingReset: boolean;
    resetting: boolean;
    startSeq: number;
    setStartSeq: (next: number) => void;
    confirm: () => void;
    cancel: () => void;
    handleReset: () => Promise<void>;
}

// Split out of SystemPane (over the line budget — docs/CodingStandards.md)
// — the "Reset the counter now" confirm/commit flow, unchanged from the
// inline version it replaces except for `startSeq`, the operator-chosen
// first number for the new series (defaults to 1, reset back to 1 whenever
// the confirm step is cancelled or completed so it never lingers stale).
export const useTicketNumberReset = (
    onResetTicketSeries: (startSeq: number) => Promise<void>,
): UseTicketNumberReset => {
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [startSeq, setStartSeq] = useState(1);

    const handleReset = async (): Promise<void> => {
        setResetting(true);
        try {
            await onResetTicketSeries(startSeq);
        } finally {
            setResetting(false);
            setConfirmingReset(false);
            setStartSeq(1);
        }
    };

    return {
        confirmingReset,
        resetting,
        startSeq,
        setStartSeq,
        confirm: () => setConfirmingReset(true),
        cancel: () => {
            setConfirmingReset(false);
            setStartSeq(1);
        },
        handleReset,
    };
};
