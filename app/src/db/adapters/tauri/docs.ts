import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import { docDraftSchema } from "../../schemas";
import type { DocDraft, DocKind, DocRow } from "../../types";

type DocMethods = Pick<
    DataPort,
    | "getDoc"
    | "listDocs"
    | "saveDoc"
    | "allocateDocSeq"
    | "saveDocAndAllocateSeq"
    | "resetDocSeries"
>;

// Every function here is a thin `invoke()` call — the actual logic (doc_seq
// allocation, hashing, filtering) lives in src-tauri/src/store/docs.rs,
// which mirrors src/db/adapters/memory/docs.ts exactly.
export const createDocMethods = (): DocMethods => ({
    getDoc: (docId) => invoke<DocRow | null>("get_doc", { docId }),

    listDocs: (query) => invoke<DocRow[]>("list_docs", { query }),

    // Zod at every boundary (docs/CodingStandards.md) — see
    // tauri/configs.ts's own comment on this same pattern.
    saveDoc: (draft: DocDraft) => invoke<DocRow>("save_doc", { draft: docDraftSchema.parse(draft) }),

    allocateDocSeq: (docId) => invoke<DocRow>("allocate_doc_seq", { docId }),

    saveDocAndAllocateSeq: (draft: DocDraft) =>
        invoke<DocRow>("save_doc_and_allocate_seq", { draft: docDraftSchema.parse(draft) }),

    resetDocSeries: (docKind: DocKind, profileId: string, startSeq?: number) =>
        invoke<{ Epoch: number }>("reset_doc_series", { docKind, profileId, startSeq }),
});
