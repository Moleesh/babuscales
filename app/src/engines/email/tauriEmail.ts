import { invoke } from "@tauri-apps/api/core";

import type { EmailSource, SendTicketEmailInput, SendTicketEmailResult } from "./types";

// Only ever imported from createEmailSource.ts's guarded branch — same
// tree-shaking guarantee as @engines/tunnel/tauriTunnel.ts's own comment.
export const createTauriEmail = (): EmailSource => ({
    hasPassword: () => invoke<boolean>("has_smtp_password"),
    savePassword: (password) => invoke<void>("save_smtp_password", { password }),
    clearPassword: () => invoke<void>("clear_smtp_password"),
    send: async (input: SendTicketEmailInput): Promise<SendTicketEmailResult> => {
        try {
            await invoke<void>("send_ticket_email", { ...input });
            return { Ok: true };
        } catch (error) {
            return { Ok: false, Error: error instanceof Error ? error.message : String(error) };
        }
    },
});
