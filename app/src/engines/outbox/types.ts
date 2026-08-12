// Outbox-worker task — real (if minimal) delivery for the Webhook, Tally
// and Board Integrations channels. Same thin 1:1-wrapper shape as
// @engines/email/@engines/sms (no Context/Provider — a send is a one-shot,
// stateless action): three small sources sharing one file instead of three
// near-empty directories, since none of them needs more than a single
// method today.

export interface SendWebhookInput {
    endpoint: string;
    secret: string;
    payloadJson: string;
}

export interface SendTallyInput {
    folder: string;
    lineCsv: string;
}

export interface SendBoardInput {
    host: string;
    port: number;
    text: string;
}

/** Never throws — a failed send is an ordinary result, same shape as `SendTicketEmailResult`/`SendTicketSmsResult`, so the outbox worker can turn it straight into a Sent/Failed row without a try/catch. */
export type ChannelSendResult = { Ok: true } | { Ok: false; Error: string };

export interface WebhookSource {
    send: (input: SendWebhookInput) => Promise<ChannelSendResult>;
}

export interface TallySource {
    send: (input: SendTallyInput) => Promise<ChannelSendResult>;
}

export interface BoardSource {
    send: (input: SendBoardInput) => Promise<ChannelSendResult>;
}

export interface OutboxChannelSources {
    webhook: WebhookSource;
    tally: TallySource;
    board: BoardSource;
}
