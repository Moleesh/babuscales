import { useState } from "react";

export interface UseAdminPasswordField {
    newPassword: string;
    setNewPassword: (value: string) => void;
    pwFlash: string | null;
    commitPassword: () => void;
}

// Split out of SystemPane (over the line budget — docs/CodingStandards.md)
// — the admin-password input's local state and commit-on-blur/Enter
// handler, unchanged from the inline version it replaces.
export const useAdminPasswordField = (
    changeAdminPassword: (newPassword: string) => Promise<void>,
): UseAdminPasswordField => {
    const [newPassword, setNewPassword] = useState("");
    const [pwFlash, setPwFlash] = useState<string | null>(null);

    const commitPassword = (): void => {
        const trimmed = newPassword.trim();
        if (!trimmed) return;
        void changeAdminPassword(trimmed).then(() => {
            setNewPassword("");
            setPwFlash("Admin password updated.");
            setTimeout(() => setPwFlash(null), 3000);
        });
    };

    return { newPassword, setNewPassword, pwFlash, commitPassword };
};
