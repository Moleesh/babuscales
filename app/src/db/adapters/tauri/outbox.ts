import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import { outboxDraftSchema, outboxPatchSchema } from "../../schemas";
import type { OutboxDraft, OutboxPatch, OutboxRow } from "../../types";

type OutboxMethods = Pick<DataPort, "enqueueOutbox" | "listOutbox" | "updateOutbox">;

// Zod at every boundary (docs/CodingStandards.md) — see
// tauri/configs.ts's own comment on this same pattern.
export const createOutboxMethods = (): OutboxMethods => ({
    enqueueOutbox: (draft: OutboxDraft) =>
        invoke<OutboxRow>("enqueue_outbox", { draft: outboxDraftSchema.parse(draft) }),

    listOutbox: (query) => invoke<OutboxRow[]>("list_outbox", { query }),

    updateOutbox: (outboxId: string, patch: OutboxPatch) =>
        invoke<OutboxRow>("update_outbox", { outboxId, patch: outboxPatchSchema.parse(patch) }),
});
