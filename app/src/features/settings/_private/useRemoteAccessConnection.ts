import { useEffect, useState } from "react";

import { useTunnel } from "@engines/tunnel";

import type { SettingsBody } from "../settingsSchema";
import { useFlashMessage } from "./useFlashMessage";

export interface UseRemoteAccessConnectionArgs {
    settings: SettingsBody;
    save: (next: SettingsBody) => Promise<void>;
}

export interface UseRemoteAccessConnection {
    enabled: boolean;
    tokenInput: string;
    setTokenInput: (value: string) => void;
    hasToken: boolean;
    flash: string | null;
    toggleEnabled: () => void;
    saveToken: () => Promise<void>;
    clearToken: () => Promise<void>;
    checkStatus: () => Promise<void>;
}

// Split out of RemoteAccessCard (over the line budget — docs/CodingStandards.md)
// — the tunnel connection/token logic, unchanged from the inline version it
// replaces. The connector token itself never touches `settings` — it's
// typed here, sent straight to `tunnel.saveToken`
// (src-tauri/src/security/mod.rs, Windows Credential Manager), and the
// input is cleared immediately after; only `hasToken` (a yes/no, fetched
// fresh, never the value itself) stays in local state.
export const useRemoteAccessConnection = ({
    settings,
    save,
}: UseRemoteAccessConnectionArgs): UseRemoteAccessConnection => {
    const tunnel = useTunnel();
    const [tokenInput, setTokenInput] = useState("");
    const [hasToken, setHasToken] = useState(false);
    const { flash, showFlash } = useFlashMessage();

    useEffect(() => {
        void tunnel.hasToken().then(setHasToken);
    }, [tunnel]);

    const enabled = settings.RemoteAccess.Enabled;

    const toggleEnabled = (): void => {
        const next = !enabled;
        void save({ ...settings, RemoteAccess: { ...settings.RemoteAccess, Enabled: next } });
        showFlash(`Remote access ${next ? "enabled" : "disabled"}`);
    };

    const saveToken = async (): Promise<void> => {
        const trimmed = tokenInput.trim();
        if (!trimmed) return;
        await tunnel.saveToken(trimmed);
        setTokenInput("");
        setHasToken(true);
        showFlash("Tunnel token saved");
    };

    const clearToken = async (): Promise<void> => {
        await tunnel.clearToken();
        setHasToken(false);
        showFlash("Tunnel token cleared — connector stopped");
    };

    const checkStatus = async (): Promise<void> => {
        const status = await tunnel.status();
        if (!status) {
            showFlash("Remote access — desktop app only, not available in this build");
            return;
        }
        if (status.State === "Running") {
            showFlash(`Remote access — connected${status.Message ? ` (${status.Message})` : ""}`);
        } else if (status.State === "Failed") {
            showFlash(`Remote access — stopped: ${status.Message ?? "cloudflared exited"}`);
        } else {
            showFlash("Remote access — stopped");
        }
    };

    return {
        enabled,
        tokenInput,
        setTokenInput,
        hasToken,
        flash,
        toggleEnabled,
        saveToken,
        clearToken,
        checkStatus,
    };
};
