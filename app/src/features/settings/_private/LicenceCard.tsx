import { Card } from "@components/Card";
// Direct subpaths, not the `@features/licensing` barrel — see SystemPane.tsx's
// own comment on why (importing the barrel here would close a
// settings → licensing → settings cycle).
import { describeLicenseState } from "@features/licensing/describeLicenseState";
import { useLicense } from "@features/licensing/useLicense";

import { useSettings } from "../useSettings";
import { LicenceActivationFields } from "./LicenceActivationFields";
import styles from "./SystemPane.module.css";
import { useLicenceCardState } from "./useLicenceCardState";

// PLAN §4.10 "licence with trial and expiry · UID machine binding", task
// #38 — the request/activate round trip is entirely offline (task #37's
// own design): this card only ever calls `@engines/licensing`'s two Tauri
// commands, never a server. `unlocked` gates Activate/Clear the same way
// every other write on this pane is gated; the status line itself is
// always visible, locked or not, since an operator needs to see "trial
// expired" without first knowing the admin password.
export const LicenceCard = () => {
    const { unlocked } = useSettings();
    const license = useLicense();
    const { requestCode, codeInput, setCodeInput, flash, hasCode, handleActivate, handleClear } =
        useLicenceCardState(license);

    return (
        <Card
            title={<span className="lbl">Licence</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <span className={license.isGated ? styles.statusBad : styles.statusOk}>
                        {license.state
                            ? describeLicenseState(license.state)
                            : license.loading
                              ? "Loading…"
                              : "Not applicable — this build has no licence to check (web demo)."}
                    </span>
                </div>
                <LicenceActivationFields
                    requestCode={requestCode}
                    codeInput={codeInput}
                    setCodeInput={setCodeInput}
                    unlocked={unlocked}
                    hasCode={hasCode}
                    onActivate={() => void handleActivate()}
                    onClear={() => void handleClear()}
                />
                <p className={styles.hint}>
                    Every install starts a free 14-day trial from first run — no account, no server.
                    To licence it, send the request code above to Babulens (see whoever supplied
                    this install for contact details — there&apos;s no in-app directory yet); they
                    sign it offline against this machine&apos;s ID and send back the activation code
                    above to paste in. Bound to this machine only — it won&apos;t work after a
                    hardware change or on a different install.
                </p>
            </div>
        </Card>
    );
};
