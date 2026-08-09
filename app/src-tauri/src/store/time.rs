//! Mirrors the memory adapter's `nowIso()` (`src/db/adapters/memory/state.ts`)
//! — RFC 3339 / ISO 8601 with a UTC offset, matching `Date.prototype.toISOString()`'s
//! shape closely enough for string comparison (`created_at >= :created_from`
//! in doc queries) to behave the same on both adapters.

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}
