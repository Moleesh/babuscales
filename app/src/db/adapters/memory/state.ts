import type { AssetRow, AuditRow, ConfigRow, DocRow, MasterRow, OutboxRow } from "../../types";

// All state for one memory-adapter instance. A plain object of Maps, not a
// class — the method modules below take this as their first argument
// instead of closing over `this`, so each resource area can live in its own
// file (docs.ts, masters.ts, ...) without an inheritance chain between them.
export interface MemoryState {
    docs: Map<string, DocRow>;
    masters: Map<string, MasterRow>;
    configs: Map<string, ConfigRow>;
    assets: Map<string, AssetRow>;
    /** Append-only, insertion order is the chain order. */
    audit: AuditRow[];
    outbox: Map<string, OutboxRow>;
    /** Current numbering epoch per `${DocKind}:${ProfileId}`. */
    seriesEpoch: Map<string, number>;
    /** Operator-chosen first number for the current epoch, per `${DocKind}:${ProfileId}`. Defaults to 1 when a series has never been reset. */
    seriesStart: Map<string, number>;
}

export const createMemoryState = (): MemoryState => ({
    docs: new Map(),
    masters: new Map(),
    configs: new Map(),
    assets: new Map(),
    audit: [],
    outbox: new Map(),
    seriesEpoch: new Map(),
    seriesStart: new Map(),
});

export const seriesKey = (docKind: string, profileId: string): string => `${docKind}:${profileId}`;

export const nowIso = (): string => new Date().toISOString();
