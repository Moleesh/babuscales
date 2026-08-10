import { useState } from "react";

import { AppModal } from "@components/AppModal";
import { Button } from "@components/Button";
import { Field } from "@components/Field";

import { useSettings } from "../useSettings";
import styles from "./AdminUnlockModal.module.css";

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
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

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
        if (!password) return;
        setChecking(true);
        const ok = await unlock(password);
        setChecking(false);
        if (ok) {
            reset();
            onClose();
        } else {
            setError("That is not the admin password.");
        }
    };

    return (
        <AppModal open={open} title="Admin unlock" onClose={close} size="small">
            <div className={styles.body}>
                <Field id="admPw" label={{ en: "Admin password" }}>
                    <input
                        id="admPw"
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
                    <Button onClick={close}>Cancel</Button>
                    <Button variant="primary" disabled={checking} onClick={() => void attempt()}>
                        Unlock
                    </Button>
                </div>
            </div>
        </AppModal>
    );
};
