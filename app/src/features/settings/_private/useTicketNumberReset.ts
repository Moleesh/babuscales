import { useState } from "react";

export interface UseTicketNumberReset {
    confirmingReset: boolean;
    resetting: boolean;
    confirm: () => void;
    cancel: () => void;
    handleReset: () => Promise<void>;
}

// Split out of SystemPane (over the line budget — docs/CodingStandards.md)
// — the "Reset the counter now" confirm/commit flow, unchanged from the
// inline version it replaces.
export const useTicketNumberReset = (onResetTicketSeries: () => Promise<void>): UseTicketNumberReset => {
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleReset = async (): Promise<void> => {
        setResetting(true);
        try {
            await onResetTicketSeries();
        } finally {
            setResetting(false);
            setConfirmingReset(false);
        }
    };

    return {
        confirmingReset,
        resetting,
        confirm: () => setConfirmingReset(true),
        cancel: () => setConfirmingReset(false),
        handleReset,
    };
};
