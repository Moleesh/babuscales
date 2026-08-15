import { invoke } from "./invoke";
import type { DataPort } from "../../DataPort";
import type { DocDraft, DocKind, DocRow } from "../../types";

type DocMethods = Pick<
    DataPort,
    "getDoc" | "listDocs" | "saveDoc" | "allocateDocSeq" | "resetDocSeries"
>;

// Every function here is a thin `invoke()` call — the actual logic (doc_seq
// allocation, hashing, filtering) lives in src-tauri/src/store/docs.rs,
// which mirrors src/db/adapters/memory/docs.ts exactly.
export const createDocMethods = (): DocMethods => ({
    getDoc: (docId) => invoke<DocRow | null>("get_doc", { docId }),

    listDocs: (query) => invoke<DocRow[]>("list_docs", { query }),

    saveDoc: (draft: DocDraft) => invoke<DocRow>("save_doc", { draft }),

    allocateDocSeq: (docId) => invoke<DocRow>("allocate_doc_seq", { docId }),

    resetDocSeries: (docKind: DocKind, profileId: string, startSeq?: number) =>
        invoke<{ Epoch: number }>("reset_doc_series", { docKind, profileId, startSeq }),
});
