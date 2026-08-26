import { useEffect, useRef, useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { Field } from "@components/Field";
import { useTranslation } from "@i18n/useTranslation";

import { useSettings } from "../useSettings";
import styles from "./_styles/AdminUnlockModal.module.css";

export interface AdminUnlockModalProps {
    open: boolean;
    onClose: () => void;
}

// Ported from demo/BabuScales-demo.html's `#admModal` — "a session unlock,
// not a second login" (the mock's own comment). Mounted once at Shell level
// (App.tsx), not inside SettingsScreen, because the mock's own admin chip
// that opens it is in the top bar, reachable from every tab.
export const AdminUnlockModal = ({ open, onClose }: AdminUnlockModalProps) => {
    const { unlock } = useSettings();
    const { t } = useTranslation();
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);

    // Task: `useModalFocus` only moves focus to the dialog's own outer
    // sheet (so Escape/Tab-trap keep working) — this is the one extra step
    // that puts the caret straight in the password field on open, since
    // typing the password is the only thing this modal is for.
    useEffect(() => {
        if (open) passwordRef.current?.focus();
    }, [open]);

    const reset = (): void => {
        setPassword("");
        setError(null);
        setChecking(false);
    };

    const close = (): void => {
        reset();
        onClose();
    };

    const attempt = async (): Promise<void> => {
        // Bug: redundant PBKDF2 verify on repeat unlock — the Enter-to-submit
        // handler below isn't itself disabled while `checking`, unlike the
        // Unlock button, so holding/mashing Enter while a verify is already
        // in flight fired a fresh (expensive by design) PBKDF2 hash per
        // keystroke instead of just the one already running.
        if (!password || checking) return;
        setChecking(true);
        const ok = await unlock(password);
        setChecking(false);
        if (ok) {
            reset();
            onClose();
        } else {
            setError(t("settings.adminUnlock.error"));
            // Task: "after wrong password let it select the text in the
            // input and wait" — select the rejected password so the next
            // keystroke replaces it outright instead of the operator having
            // to clear it themselves first.
            passwordRef.current?.focus();
            passwordRef.current?.select();
        }
    };

    return (
        <AppModal open={open} title={t("settings.adminUnlock.title")} onClose={close} size="small">
            <div className={styles.body}>
                <Field id="admPw" label={t("settings.adminPassword")}>
                    <input
                        id="admPw"
                        ref={passwordRef}
                        type="password"
                        autoComplete="off"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") void attempt();
                        }}
                    />
                </Field>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.actions}>
                    <Button onClick={close}>{t("settings.adminUnlock.cancel")}</Button>
                    <Button variant="primary" disabled={checking} onClick={() => void attempt()}>
                        {t("settings.adminUnlock.unlock")}
                    </Button>
                </div>
            </div>
        </AppModal>
    );
};
