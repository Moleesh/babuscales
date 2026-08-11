import { useEffect, useRef, useState } from "react";

// Direct subpath, not the `@features/licensing` barrel — see SystemPane.tsx's
// own comment on why (importing the barrel here would close a
// settings → licensing → settings cycle).
import type { useLicense } from "@features/licensing/useLicense";

// Mock's own `flash()` timing, reused from ConnectionsPane's RemoteAccessCard.
const FLASH_MS = 3000;

export interface UseLicenceCardState {
    requestCode: string | null;
    codeInput: string;
    setCodeInput: (value: string) => void;
    flash: string | null;
    hasCode: boolean;
    handleActivate: () => Promise<void>;
    handleClear: () => Promise<void>;
}

// Split out of LicenceCard (over the line budget — docs/CodingStandards.md)
// — the local UI state (request code fetch, the pasted-code input, the
// flash message) and the two write handlers, unchanged from the inline
// versions they replace. `license` itself stays owned by the caller
// (`useLicense()`) rather than re-fetched here.
export const useLicenceCardState = (license: ReturnType<typeof useLicense>): UseLicenceCardState => {
    const [requestCode, setRequestCode] = useState<string | null>(null);
    const [codeInput, setCodeInput] = useState("");
    const [flash, setFlash] = useState<string | null>(null);
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        void license.requestCode().then(setRequestCode);
    }, [license]);

    useEffect(
        () => () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
        },
        [],
    );

    const showFlash = (message: string): void => {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setFlash(message);
        flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
    };

    const handleActivate = async (): Promise<void> => {
        const result = await license.activate(codeInput);
        showFlash(result.message);
        if (result.ok) setCodeInput("");
    };

    const handleClear = async (): Promise<void> => {
        await license.clearActivation();
        showFlash("Activation code cleared — back to the trial clock.");
    };

    // A code was saved at some point if the current read isn't a trial
    // state — there's nothing else `Licensed`/`Expired`/`Invalid` could
    // come from (see `licensing::evaluate`, src-tauri/src/licensing/mod.rs:
    // those three are only ever reached once `activation_code` is `Some`).
    const hasCode =
        license.state?.Kind === "Licensed" ||
        license.state?.Kind === "Expired" ||
        license.state?.Kind === "Invalid";

    return { requestCode, codeInput, setCodeInput, flash, hasCode, handleActivate, handleClear };
};
