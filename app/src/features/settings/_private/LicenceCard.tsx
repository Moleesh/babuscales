import { Card } from "@components/Card";
// Direct subpaths, not the `@features/licensing` barrel — see SystemPane.tsx's
// own comment on why (importing the barrel here would close a
// settings → licensing → settings cycle).
import { describeLicenseState } from "@features/licensing/describeLicenseState";
import { useLicense } from "@features/licensing/useLicense";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/SystemPane.module.css";
import { LicenceActivationFields } from "./LicenceActivationFields";
import { useLicenceCardState } from "./useLicenceCardState";

// "Licence with trial and expiry · UID machine binding" —
// the request/activate round trip is entirely offline by design: this card only ever calls `@engines/licensing`'s two Tauri
// commands, never a server. `unlocked` gates Activate/Clear the same way
// every other write on this pane is gated; the status line itself is
// always visible, locked or not, since an operator needs to see "trial
// expired" without first knowing the admin password.
export const LicenceCard = () => {
    const { unlocked } = useSettings();
    const license = useLicense();
    const { t } = useTranslation();
    const { requestCode, codeInput, setCodeInput, flash, hasCode, handleActivate, handleClear } =
        useLicenceCardState(license);

    return (
        <Card
            sticky
            title={<span className="lbl">{t("settings.licence.title")}</span>}
            headerRight={flash ? <span className={styles.applied}>{flash}</span> : null}
        >
            <div className={styles.body}>
                <div className={styles.statusRow}>
                    <span className={license.isGated ? styles.statusBad : styles.statusOk}>
                        {license.state
                            ? describeLicenseState(license.state)
                            : license.loading
                              ? t("masters.loading")
                              : t("settings.licence.notApplicable")}
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
                <p className={styles.hint}>{t("settings.licence.hint")}</p>
            </div>
        </Card>
    );
};
