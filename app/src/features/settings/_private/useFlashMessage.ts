import { useEffect, useRef, useState } from "react";

// Mock's own `flash()`: a transient message that self-clears after 3s (same
// timing SystemPane's password-change confirmation already uses).
const FLASH_MS = 3000;

export interface UseFlashMessage {
    flash: string | null;
    showFlash: (message: string) => void;
}

// Shared by every ConnectionsPane card with a self-clearing header message
// (IntegrationsCard/RemoteAccessCard/EmailCard/SmsCard) — extracted since
// each repeated the identical timer/cleanup pattern.
export const useFlashMessage = (ms: number = FLASH_MS): UseFlashMessage => {
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const showFlash = (message: string): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash(message);
        flashTimer.current = setTimeout(() => setFlash(null), ms);
    };

    return { flash, showFlash };
};
