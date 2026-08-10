// Task #42 — real Email/SMTP ticket delivery. Unlike @engines/tunnel there
// is no shared live status to poll (a send is a one-shot, stateless action,
// not a running connection), so this module is a thin 1:1 wrapper over the
// Tauri commands only — same shape as @engines/licensing, no Context/
// Provider. The SMTP host/port/username live as ordinary Settings config
// (settingsSchema.ts's `Smtp`); only the password is a secret here.

export interface SendTicketEmailInput {
    host: string;
    port: number;
    username: string;
    to: string;
    subject: string;
    body: string;
}

/** Never throws — a failed send (bad host, no password saved, SMTP auth rejected, ...) is an ordinary result, same shape as `TunnelStatus.State === "Failed"`, so the caller (WeighingScreen's print flow) can turn it straight into an outbox `Failed` row and a flash message without a try/catch. */
export type SendTicketEmailResult = { Ok: true } | { Ok: false; Error: string };

export interface EmailSource {
    /** Whether an SMTP password has been saved, without exposing its value. */
    hasPassword: () => Promise<boolean>;
    /** Overwrites any previously saved password. */
    savePassword: (password: string) => Promise<void>;
    clearPassword: () => Promise<void>;
    send: (input: SendTicketEmailInput) => Promise<SendTicketEmailResult>;
}
