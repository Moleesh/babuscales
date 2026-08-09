import type { MemoryState } from "./state";
import { nowIso } from "./state";
import type { DataPort } from "../../DataPort";
import { hashAuditRow } from "../../hash";
import { newId } from "../../id";
import { auditDraftSchema } from "../../schemas";
import type { AuditDraft, AuditRow } from "../../types";

type AuditMethods = Pick<DataPort, "appendAudit" | "listAudit">;

export const createAuditMethods = (state: MemoryState): AuditMethods => ({
    appendAudit: async (draft: AuditDraft) => {
        const parsed = auditDraftSchema.parse(draft);
        const prevHash = state.audit.at(-1)?.RowHash ?? null;
        const at = nowIso();
        const content = {
            Actor: parsed.Actor,
            Action: parsed.Action,
            Target: parsed.Target ?? null,
            Body: parsed.Body,
            At: at,
        };

        const row: AuditRow = {
            AuditId: newId(),
            At: at,
            Actor: parsed.Actor,
            Action: parsed.Action,
            Target: parsed.Target ?? null,
            Body: parsed.Body,
            RowHash: await hashAuditRow(content, prevHash),
            PrevHash: prevHash,
        };
        // Append-only by construction — nothing in this module ever removes
        // or reorders an entry once pushed.
        state.audit.push(row);
        return row;
    },

    listAudit: (query = {}) => {
        const rows = state.audit
            .filter((row) => !query.Target || row.Target === query.Target)
            .filter((row) => !query.From || row.At >= query.From)
            .filter((row) => !query.To || row.At <= query.To)
            .slice()
            .reverse();
        return Promise.resolve(query.Limit !== undefined ? rows.slice(0, query.Limit) : rows);
    },
});
