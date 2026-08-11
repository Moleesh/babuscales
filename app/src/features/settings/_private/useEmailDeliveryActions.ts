import { useEffect, useState } from "react";

import { createEmailSource } from "@engines/email/createEmailSource";

import type { SettingsBody } from "../settingsSchema";
import { useFlashMessage } from "./useFlashMessage";

export interface UseEmailDeliveryArgs {
    settings: SettingsBody;
}

export interface UseEmailDelivery {
    passwordInput: string;
    setPasswordInput: (value: string) => void;
    hasPassword: boolean;
    testTo: string;
    setTestTo: (value: string) => void;
    sending: boolean;
    flash: string | null;
    savePassword: () => Promise<void>;
    clearPassword: () => Promise<void>;
    sendTest: () => Promise<void>;
}

// Split out of EmailCard (over the line budget — docs/CodingStandards.md) —
// the SMTP password/test-send logic, unchanged from the inline version it
// replaces. The password goes straight to `email.savePassword` (Windows
// Credential Manager); only `hasPassword` (never the value) stays in local
// state.
export const useEmailDeliveryActions = ({ settings }: UseEmailDeliveryArgs): UseEmailDelivery => {
    const [email] = useState(() => createEmailSource());
    const [passwordInput, setPasswordInput] = useState("");
    const [hasPassword, setHasPassword] = useState(false);
    const [testTo, setTestTo] = useState("");
    const [sending, setSending] = useState(false);
    const { flash, showFlash } = useFlashMessage();

    useEffect(() => {
        void email.hasPassword().then(setHasPassword);
    }, [email]);

    const smtp = settings.Smtp;

    const savePassword = async (): Promise<void> => {
        const trimmed = passwordInput.trim();
        if (!trimmed) return;
        await email.savePassword(trimmed);
        setPasswordInput("");
        setHasPassword(true);
        showFlash("SMTP password saved");
    };

    const clearPassword = async (): Promise<void> => {
        await email.clearPassword();
        setHasPassword(false);
        showFlash("SMTP password cleared");
    };

    const sendTest = async (): Promise<void> => {
        const to = testTo.trim();
        if (!to) return;
        setSending(true);
        try {
            const result = await email.send({
                host: smtp.Host,
                port: smtp.Port,
                username: smtp.Username,
                to,
                subject: "BabuScales — test e-mail",
                body: "This is a test message from BabuScales' Settings → Connections pane. If it arrived, this SMTP configuration works.",
            });
            showFlash(result.Ok ? `Test e-mail sent to ${to}` : `Send failed — ${result.Error}`);
        } finally {
            setSending(false);
        }
    };

    return {
        passwordInput,
        setPasswordInput,
        hasPassword,
        testTo,
        setTestTo,
        sending,
        flash,
        savePassword,
        clearPassword,
        sendTest,
    };
};
