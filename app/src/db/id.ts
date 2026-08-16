import { ulid } from "ulid";

// The single place that decides what a row id looks like. Every table
// uses a ULID primary key — sortable, offline-safe, no round trip
// to a sequence. Adapters call this instead of importing `ulid` directly, so
// the strategy can change once without touching every call site.
export const newId = (): string => ulid();
