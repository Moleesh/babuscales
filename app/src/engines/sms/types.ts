// Task #43 — real SMS delivery via a serial-attached GSM modem. Same thin
// 1:1-wrapper shape as @engines/email (no Context/Provider — a send is a
// one-shot, stateless action), plus one method @engines/email has no need
// for: listPorts(), reusing the exact "list_serial_ports" Tauri command
// @engines/indicator's serialIndicator.ts already calls — a GSM modem is
// just another device on a COM port. No password methods here: AT commands
// over a local serial port need no auth, unlike SMTP.

export interface SendTicketSmsInput {
    port: string;
    baud: number;
    to: string;
    message: string;
}

/** Never throws — a failed send (bad port, modem not responding, no signal, ...) is an ordinary result, same shape as `SendTicketEmailResult`, so the caller (WeighingScreen's print flow) can turn it straight into an outbox `Failed` row and a flash message without a try/catch. */
export type SendTicketSmsResult = { Ok: true } | { Ok: false; Error: string };

export interface SmsSource {
    /** Serial ports available on this machine — same list the weight indicator's own port picker draws from. */
    listPorts: () => Promise<string[]>;
    send: (input: SendTicketSmsInput) => Promise<SendTicketSmsResult>;
}
