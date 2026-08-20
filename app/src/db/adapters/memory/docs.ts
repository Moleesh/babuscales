import type { MemoryState } from "./state";
import { nowIso, seriesKey } from "./state";
import type { DataPort } from "../../DataPort";
import { hashBody } from "../../hash";
import { newId } from "../../id";
import { docDraftSchema } from "../../schemas";
import type { DocDraft, DocKind, DocQuery, DocRow } from "../../types";

type DocMethods = Pick<
    DataPort,
    | "getDoc"
    | "listDocs"
    | "saveDoc"
    | "allocateDocSeq"
    | "saveDocAndAllocateSeq"
    | "resetDocSeries"
>;

const matches = (doc: DocRow, query: DocQuery): boolean => {
    if (query.DocKind && doc.DocKind !== query.DocKind) return false;
    if (query.ProfileId && doc.ProfileId !== query.ProfileId) return false;
    if (query.IsCancelled !== undefined && doc.IsCancelled !== query.IsCancelled) return false;
    if (query.CreatedFrom && doc.CreatedAt < query.CreatedFrom) return false;
    if (query.CreatedTo && doc.CreatedAt > query.CreatedTo) return false;
    return true;
};

const saveDocImpl = async (state: MemoryState, draft: DocDraft): Promise<DocRow> => {
    const parsed = docDraftSchema.parse(draft);
    const existing = parsed.DocId ? state.docs.get(parsed.DocId) : undefined;
    const profileId = parsed.ProfileId ?? existing?.ProfileId ?? "default";
    const epoch =
        existing?.SeriesEpoch ?? state.seriesEpoch.get(seriesKey(parsed.DocKind, profileId)) ?? 0;

    const row: DocRow = {
        DocId: existing?.DocId ?? parsed.DocId ?? newId(),
        DocKind: parsed.DocKind,
        ProfileId: profileId,
        SeriesEpoch: epoch,
        DocSeq: existing?.DocSeq ?? null,
        IsCancelled: parsed.IsCancelled ?? existing?.IsCancelled ?? false,
        Body: parsed.Body,
        CreatedAt: existing?.CreatedAt ?? nowIso(),
        UpdatedAt: nowIso(),
        BodyHash: await hashBody(parsed.Body),
    };
    state.docs.set(row.DocId, row);
    return row;
};

const allocateDocSeqImpl = (state: MemoryState, docId: string): Promise<DocRow> => {
    const doc = state.docs.get(docId);
    if (!doc) return Promise.reject(new Error(`allocateDocSeq: no doc ${docId}`));
    if (doc.DocSeq !== null) return Promise.resolve(doc);

    // The allocation group is (DocKind, ProfileId, SeriesEpoch) — the same
    // triple the `ux_doc_seq` unique index covers.
    const inGroup = Array.from(state.docs.values()).filter(
        (d) =>
            d.DocKind === doc.DocKind &&
            d.ProfileId === doc.ProfileId &&
            d.SeriesEpoch === doc.SeriesEpoch,
    );
    const assignedSeqs = inGroup.map((d) => d.DocSeq).filter((seq): seq is number => seq !== null);
    const nextSeq =
        assignedSeqs.length === 0
            ? (state.seriesStart.get(seriesKey(doc.DocKind, doc.ProfileId)) ?? 1)
            : Math.max(...assignedSeqs) + 1;
    const updated: DocRow = { ...doc, DocSeq: nextSeq, UpdatedAt: nowIso() };
    state.docs.set(doc.DocId, updated);
    return Promise.resolve(updated);
};

export const createDocMethods = (state: MemoryState): DocMethods => {
    const saveDoc = (draft: DocDraft) => saveDocImpl(state, draft);
    const allocateDocSeq = (docId: string) => allocateDocSeqImpl(state, docId);

    return {
        getDoc: (docId) => Promise.resolve(state.docs.get(docId) ?? null),

        listDocs: (query = {}) => {
            const rows = Array.from(state.docs.values())
                .filter((doc) => matches(doc, query))
                .sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt));
            const offset = query.Offset ?? 0;
            const end = query.Limit !== undefined ? offset + query.Limit : undefined;
            return Promise.resolve(rows.slice(offset, end));
        },

        saveDoc,

        allocateDocSeq,

        // No real cross-process race in this adapter (JS is single-threaded and
        // nothing here awaits between the two steps' synchronous state
        // mutations), so this is just the two calls in sequence — the atomicity
        // guarantee is only load-bearing on the Tauri adapter, where each step
        // is its own IPC round trip. Kept as a real combined method (not a
        // no-op) so callers can use one DataPort call regardless of adapter.
        saveDocAndAllocateSeq: async (draft: DocDraft) => {
            const saved = await saveDoc(draft);
            return saved.DocSeq === null ? allocateDocSeq(saved.DocId) : saved;
        },

        resetDocSeries: (docKind: DocKind, profileId: string, startSeq?: number) => {
            const key = seriesKey(docKind, profileId);
            const nextEpoch = (state.seriesEpoch.get(key) ?? 0) + 1;
            state.seriesEpoch.set(key, nextEpoch);
            state.seriesStart.set(key, startSeq ?? 1);
            return Promise.resolve({ Epoch: nextEpoch });
        },
    };
};
