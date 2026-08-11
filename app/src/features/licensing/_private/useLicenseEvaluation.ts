import { useEffect, useState } from "react";

import type { LicenseState, LicensingSource } from "@engines/licensing";

import type { LicenseBody } from "../licenseSchema";

export interface UseLicenseEvaluation {
    state: LicenseState | null;
    loading: boolean;
    setState: (state: LicenseState | null) => void;
}

// Split out of LicenseProvider (over the line budget — docs/CodingStandards.md)
// — re-evaluated whenever the persisted row changes, unchanged from the
// inline version it replaces. A fresh Trial reading every render would
// drift by however long the tab's been open; this only ever reflects
// what's actually saved. `setState` is exposed so activate/clearActivation
// can push a result in immediately rather than waiting on this effect to
// re-run after they change `body`.
export const useLicenseEvaluation = (
    source: LicensingSource,
    body: LicenseBody | null,
): UseLicenseEvaluation => {
    const [state, setState] = useState<LicenseState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!body) return;
        let cancelled = false;
        void source.evaluate(body.TrialStartedOn, body.ActivationCode).then((result) => {
            if (cancelled) return;
            setState(result);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [source, body]);

    return { state, loading, setState };
};
