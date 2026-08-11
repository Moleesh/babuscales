import { useEffect, useState } from "react";

import type { DataPort } from "@db/DataPort";

import { LICENSE_CONFIG_ID, licenseBodySchema } from "../licenseSchema";
import type { LicenseBody } from "../licenseSchema";

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export interface UseLicenseRecord {
    body: LicenseBody | null;
    version: number;
    setBody: (body: LicenseBody) => void;
    setVersion: (version: number) => void;
}

// Split out of LicenseProvider (over the line budget — docs/CodingStandards.md)
// — the `"license"` config row's load, unchanged from the inline version it
// replaces: parse what's on disk, or start a fresh trial on a fresh install
// (or a foreign/corrupt Body) rather than brick the app on a parse failure
// (same reasoning as SettingsProvider's own fallback branch).
export const useLicenseRecord = (db: DataPort): UseLicenseRecord => {
    const [body, setBody] = useState<LicenseBody | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const row = await db.getConfig(LICENSE_CONFIG_ID);
            if (cancelled) return;
            const parsed = row ? licenseBodySchema.safeParse(row.Body) : null;
            if (row && parsed?.success) {
                setBody(parsed.data);
                setVersion(row.Version);
                return;
            }
            const fresh: LicenseBody = { TrialStartedOn: todayIso(), ActivationCode: null };
            const saved = await db.saveConfig({
                ConfigId: LICENSE_CONFIG_ID,
                ConfigKind: "License",
                Body: fresh,
            });
            if (cancelled) return;
            setBody(fresh);
            setVersion(saved.Version);
        })();
        return () => {
            cancelled = true;
        };
    }, [db]);

    return { body, version, setBody, setVersion };
};
