//! Mirrors `src/db/id.ts` — every table in PLAN §6.1 uses a ULID primary
//! key. One function, so the strategy can change once without touching
//! every call site.

pub fn new_id() -> String {
    ulid::Ulid::new().to_string()
}
