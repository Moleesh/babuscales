import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import { auditDraftSchema } from "../../schemas";
import type { AuditDraft, AuditRow } from "../../types";

type AuditMethods = Pick<DataPort, "appendAudit" | "listAudit">;

// Zod at every boundary (docs/CodingStandards.md) — see
// tauri/configs.ts's own comment on this same pattern.
export const createAuditMethods = (): AuditMethods => ({
    appendAudit: (draft: AuditDraft) =>
        invoke<AuditRow>("append_audit", { draft: auditDraftSchema.parse(draft) }),

    listAudit: (query) => invoke<AuditRow[]>("list_audit", { query }),
});
