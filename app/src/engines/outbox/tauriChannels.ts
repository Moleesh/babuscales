import { invoke } from "@tauri-apps/api/core";

import type {
    ChannelSendResult,
    OutboxChannelSources,
    SendBoardInput,
    SendTallyInput,
    SendWebhookInput,
} from "./types";

// Only ever imported from createOutboxChannels.ts's guarded branch — same
// tree-shaking guarantee as @engines/email/tauriEmail.ts's own comment.
const toResult = async (invoke_: Promise<void>): Promise<ChannelSendResult> => {
    try {
        await invoke_;
        return { Ok: true };
    } catch (error) {
        return { Ok: false, Error: error instanceof Error ? error.message : String(error) };
    }
};

export const createTauriOutboxChannels = (): OutboxChannelSources => ({
    webhook: {
        send: (input: SendWebhookInput) => toResult(invoke<void>("send_webhook", { ...input })),
    },
    tally: {
        send: (input: SendTallyInput) => toResult(invoke<void>("write_tally_export", { ...input })),
    },
    board: {
        send: (input: SendBoardInput) => toResult(invoke<void>("send_board_message", { ...input })),
    },
});
