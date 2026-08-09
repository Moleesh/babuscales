import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { AuditDraft, AuditRow } from "../../types";

type AuditMethods = Pick<DataPort, "appendAudit" | "listAudit">;

export const createAuditMethods = (): AuditMethods => ({
    appendAudit: (draft: AuditDraft) => invoke<AuditRow>("append_audit", { draft }),

    listAudit: (query) => invoke<AuditRow[]>("list_audit", { query }),
});
