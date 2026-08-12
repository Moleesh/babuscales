export { MAX_OUTBOX_ATTEMPTS, nextBackoffDelayMs, reconcileOutboxOutcome } from "./backoff";
export type {
    BoardSource,
    ChannelSendResult,
    OutboxChannelSources,
    SendBoardInput,
    SendTallyInput,
    SendWebhookInput,
    TallySource,
    WebhookSource,
} from "./types";
// createOutboxChannels is deliberately NOT exported here — see that file's
// own comment. Import it directly from "@engines/outbox/createOutboxChannels".
