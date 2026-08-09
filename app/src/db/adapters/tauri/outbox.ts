import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { OutboxDraft, OutboxPatch, OutboxRow } from "../../types";

type OutboxMethods = Pick<DataPort, "enqueueOutbox" | "listOutbox" | "updateOutbox">;

export const createOutboxMethods = (): OutboxMethods => ({
    enqueueOutbox: (draft: OutboxDraft) => invoke<OutboxRow>("enqueue_outbox", { draft }),

    listOutbox: (query) => invoke<OutboxRow[]>("list_outbox", { query }),

    updateOutbox: (outboxId: string, patch: OutboxPatch) =>
        invoke<OutboxRow>("update_outbox", { outboxId, patch }),
});
