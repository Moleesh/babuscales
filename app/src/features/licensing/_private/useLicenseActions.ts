import { useCallback } from "react";

import type { DataPort } from "@db/DataPort";
import type { LicenseState, LicensingSource } from "@engines/licensing";

import { describeLicenseState } from "../describeLicenseState";
import { LICENSE_CONFIG_ID } from "../licenseSchema";
import type { LicenseBody } from "../licenseSchema";

export interface UseLicenseActionsArgs {
    db: DataPort;
    source: LicensingSource;
    unlocked: boolean;
    body: LicenseBody | null;
    version: number;
    setBody: (body: LicenseBody) => void;
    setVersion: (version: number) => void;
    setState: (state: LicenseState | null) => void;
}

export interface UseLicenseActions {
    requestCode: () => Promise<string | null>;
    activate: (code: string) => Promise<{ ok: boolean; message: string }>;
    clearActivation: () => Promise<void>;
}

// Split out of LicenseProvider (over the line budget — docs/CodingStandards.md)
// — the three write-path callbacks, unchanged from the inline versions they
// replace: every write to ActivationCode is validated against the real
// crypto (source.evaluate) *before* it's persisted, so a mistyped paste is
// reported back rather than silently saved over a working code.
export const useLicenseActions = ({
    db,
    source,
    unlocked,
    body,
    version,
    setBody,
    setVersion,
    setState,
}: UseLicenseActionsArgs): UseLicenseActions => {
    const requestCode = useCallback((): Promise<string | null> => source.requestCode(), [source]);

    const activate = useCallback(
        async (code: string): Promise<{ ok: boolean; message: string }> => {
            if (!unlocked) return { ok: false, message: "Unlock Settings first." };
            const trimmed = code.trim();
            if (!trimmed) return { ok: false, message: "Enter a code first." };
            if (!body) return { ok: false, message: "Still loading — try again in a moment." };
            const result = await source.evaluate(body.TrialStartedOn, trimmed);
            if (!result) {
                return { ok: false, message: "Not available in this build." };
            }
            if (result.Kind === "Invalid") {
                return { ok: false, message: result.reason };
            }
            const nextBody: LicenseBody = { ...body, ActivationCode: trimmed };
            const saved = await db.saveConfig({
                ConfigId: LICENSE_CONFIG_ID,
                ConfigKind: "License",
                Body: nextBody,
                Version: version + 1,
            });
            setBody(nextBody);
            setVersion(saved.Version);
            setState(result);
            return { ok: true, message: describeLicenseState(result) };
        },
        [unlocked, body, db, version, source, setBody, setVersion, setState],
    );

    const clearActivation = useCallback(async (): Promise<void> => {
        if (!unlocked || !body) return;
        const nextBody: LicenseBody = { ...body, ActivationCode: null };
        const saved = await db.saveConfig({
            ConfigId: LICENSE_CONFIG_ID,
            ConfigKind: "License",
            Body: nextBody,
            Version: version + 1,
        });
        setBody(nextBody);
        setVersion(saved.Version);
        const result = await source.evaluate(nextBody.TrialStartedOn, null);
        setState(result);
    }, [unlocked, body, db, version, source, setBody, setVersion, setState]);

    return { requestCode, activate, clearActivation };
};
