-- The fixed schema — PLAN §6.1. Created once, never altered: every
-- statement is IF NOT EXISTS so this file can be executed on every
-- startup and do nothing on a database that already has it.
--
-- The PRAGMAs from PLAN §6.1 (page_size, journal_mode, synchronous,
-- foreign_keys, busy_timeout) are applied in store::open before this file
-- runs, not batched in here — `journal_mode` returns the resulting mode as
-- a row even when only setting it, which `execute_batch` rejects.

-- Every business record: tickets, invoices. Nothing else is ever added.
CREATE TABLE IF NOT EXISTS doc (
  doc_id       TEXT PRIMARY KEY,                       -- ULID: sortable, offline-safe
  doc_kind     TEXT NOT NULL,                          -- 'Ticket' | 'Invoice'
  profile_id   TEXT NOT NULL DEFAULT 'default',        -- multi-profile base, UI hidden
  series_epoch INTEGER NOT NULL DEFAULT 0,             -- bumped by a numbering reset
  doc_seq      INTEGER,                                -- human-facing number, NULL until issued
  is_cancelled INTEGER NOT NULL DEFAULT 0,             -- a flag, not a status — PLAN §7.4
  body         TEXT NOT NULL CHECK (json_valid(body)), -- all fields, all captures
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  body_hash    TEXT NOT NULL                           -- hash of CURRENT body, not a chain
);

-- Ticket numbers must be unique per profile per numbering epoch. Without
-- this, two operators (cabin PC + phone on the LAN) can be issued the same
-- number. Numbers are allocated inside BEGIN IMMEDIATE, at close, never at
-- draft.
CREATE UNIQUE INDEX IF NOT EXISTS ux_doc_seq
  ON doc (doc_kind, profile_id, series_epoch, doc_seq)
  WHERE doc_seq IS NOT NULL;

-- `list_docs` (store/docs.rs) always filters on doc_kind and always sorts
-- by created_at DESC (Weighing's open-ticket strip and Reports both load
-- every Ticket doc this way) — without this, that's a full table scan
-- followed by a sort on every load, which gets slower linearly as ticket
-- history grows (PLAN §21 "might affect other tabs when the data grows
-- more"). The column order matches the query: doc_kind narrows first,
-- created_at DESC lets SQLite walk the index in the query's own sort order
-- instead of materialising and sorting the filtered rows separately.
CREATE INDEX IF NOT EXISTS ix_doc_kind_created_at
  ON doc (doc_kind, created_at DESC);

-- The *current* numbering epoch per (doc_kind, profile_id) — bumped by a
-- manual numbering reset ("reset ticket no", PLAN §6.1/§4.10). Not
-- derivable from `doc` alone: right after a reset the new epoch has zero
-- rows yet, so MAX(series_epoch) over existing docs would still return the
-- old one. Mirrors the memory adapter's own `state.seriesEpoch` map, which
-- is likewise treated as durable state (carried in its backup snapshot).
CREATE TABLE IF NOT EXISTS series_counter (
  doc_kind   TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  epoch      INTEGER NOT NULL DEFAULT 0,
  start_seq  INTEGER NOT NULL DEFAULT 1,      -- operator-chosen first number for this epoch
  PRIMARY KEY (doc_kind, profile_id)
);

-- All reference data: parties, materials, vehicles, transporters, places, tares, operators.
CREATE TABLE IF NOT EXISTS master (
  master_id   TEXT PRIMARY KEY,
  master_kind TEXT NOT NULL,
  name        TEXT NOT NULL COLLATE NOCASE,
  body        TEXT NOT NULL CHECK (json_valid(body)),
  is_active   INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL,
  UNIQUE (master_kind, name)
);

-- All configuration: schemas, layouts, templates, settings, formats, presets, indexes.
CREATE TABLE IF NOT EXISTS config (
  config_id   TEXT PRIMARY KEY,
  config_kind TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (json_valid(body)),
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL
);

-- ALL binary content: camera images, logos, fonts, template assets, signatures.
-- Named `asset`, not `blob` — BLOB is a type name and reads ambiguously in every query.
CREATE TABLE IF NOT EXISTS asset (
  asset_id    TEXT PRIMARY KEY,
  asset_kind  TEXT NOT NULL,
  owner_id    TEXT,                                   -- doc_id / config_id. Polymorphic,
                                                        -- so NOT FK-enforceable — needs a reaper
  mime_type   TEXT NOT NULL,
  bytes       BLOB NOT NULL,
  size_bytes  INTEGER NOT NULL,
  sha256      TEXT NOT NULL,
  meta        TEXT NOT NULL CHECK (json_valid(meta)), -- camera, stage, crop, ANPR result
  created_at  TEXT NOT NULL
);
-- NEVER `SELECT *` from asset: SQLite materialises the whole row, so selecting
-- metadata would load every image. Enforced by lint (Phase 1 CI, PLAN §19).

CREATE TABLE IF NOT EXISTS audit (
  audit_id TEXT PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL,
  action TEXT NOT NULL, target TEXT, body TEXT NOT NULL, row_hash TEXT NOT NULL,
  prev_hash TEXT
);
CREATE TABLE IF NOT EXISTS outbox (
  outbox_id TEXT PRIMARY KEY, channel TEXT NOT NULL, body TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, next_try_at TEXT, state TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS journal (
  journal_id TEXT PRIMARY KEY, at TEXT NOT NULL, applied INTEGER NOT NULL
  DEFAULT 0, body TEXT NOT NULL
);

-- doc_fts/master_fts (contentless FTS5 virtual tables) were dropped here —
-- PLAN §21 flagged them as dead: created but never queried by anything.
-- Masters search instead does a plain `LIKE`/keyset-paginated scan
-- (commands/masters.rs, useMasterListPage.ts) and the client-side substring
-- filter in useMasterCache.ts; real FTS5 wiring is deferred until it's
-- actually needed, not maintained half-built. No installed database has
-- ever shipped with these tables (no licence has gone out yet — PLAN §23
-- item 4), so there is nothing to migrate away from on an existing file.
