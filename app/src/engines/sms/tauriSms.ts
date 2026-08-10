import { invoke } from "@tauri-apps/api/core";

import type { SendTicketSmsInput, SendTicketSmsResult, SmsSource } from "./types";

// Only ever imported from createSmsSource.ts's guarded branch — same
// tree-shaking guarantee as @engines/email/tauriEmail.ts's own comment.
export const createTauriSms = (): SmsSource => ({
    listPorts: () => invoke<string[]>("list_serial_ports"),
    send: async (input: SendTicketSmsInput): Promise<SendTicketSmsResult> => {
        try {
            await invoke<void>("send_ticket_sms", { ...input });
            return { Ok: true };
        } catch (error) {
            return { Ok: false, Error: error instanceof Error ? error.message : String(error) };
        }
    },
});
