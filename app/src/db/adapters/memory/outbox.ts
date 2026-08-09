import type { MemoryState } from "./state";
import type { DataPort } from "../../DataPort";
import { newId } from "../../id";
import { outboxDraftSchema, outboxPatchSchema } from "../../schemas";
import type { OutboxDraft, OutboxRow } from "../../types";

type OutboxMethods = Pick<DataPort, "enqueueOutbox" | "listOutbox" | "updateOutbox">;

export const createOutboxMethods = (state: MemoryState): OutboxMethods => ({
    enqueueOutbox: (draft: OutboxDraft) => {
        const parsed = outboxDraftSchema.parse(draft);
        const row: OutboxRow = {
            OutboxId: newId(),
            Channel: parsed.Channel,
            Body: parsed.Body,
            Attempts: 0,
            NextTryAt: parsed.NextTryAt ?? null,
            State: "Pending",
        };
        state.outbox.set(row.OutboxId, row);
        return Promise.resolve(row);
    },

    listOutbox: (query = {}) => {
        const rows = Array.from(state.outbox.values()).filter(
            (row) =>
                (!query.State || row.State === query.State) &&
                (!query.Channel || row.Channel === query.Channel),
        );
        return Promise.resolve(rows);
    },

    updateOutbox: (outboxId, patch) => {
        const existing = state.outbox.get(outboxId);
        if (!existing) return Promise.reject(new Error(`updateOutbox: no entry ${outboxId}`));
        const parsed = outboxPatchSchema.parse(patch);
        const updated: OutboxRow = {
            ...existing,
            Attempts: parsed.Attempts ?? existing.Attempts,
            NextTryAt: parsed.NextTryAt !== undefined ? parsed.NextTryAt : existing.NextTryAt,
            State: parsed.State ?? existing.State,
        };
        state.outbox.set(outboxId, updated);
        return Promise.resolve(updated);
    },
});
