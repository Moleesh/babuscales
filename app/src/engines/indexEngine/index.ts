// Expression-index manager (PLAN §6.3, §21 Medium bucket). The real
// create/drop work is server-side (src-tauri/src/commands/indexes.rs) since
// SQLite DDL can only run there — this file holds only the one pure
// frontend concern: pre-validating a JSON path before it is sent, as a UX
// nicety. It is not the source of truth; the Rust command re-validates the
// same shape unconditionally (its own doc comment explains why) and is the
// only validation that actually protects the database.
//
// Mirrors `PATH_PATTERN` in src-tauri/src/commands/indexes.rs exactly —
// letters/digits/underscore segments, dot-separated, up to 4 segments, e.g.
// "VehicleNo" or "Address.City". Keep the two in sync if either changes.
const PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*){0,3}$/;

export const isValidIndexPath = (path: string): boolean => PATH_PATTERN.test(path);
