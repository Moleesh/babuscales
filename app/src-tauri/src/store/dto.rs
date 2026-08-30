//! The Rust view of `src/db/types.ts` — same fields, same PascalCase JSON
//! shape (`#[serde(rename_all = "PascalCase")]` turns each snake_case Rust
//! field into the matching TS one automatically), so `invoke()` on the
//! frontend deserialises these with zero mapping code. Deliberately thin,
//! same as the TS file it mirrors: this is table columns, not business
//! shape.

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value as Json;

/// The standard serde trick for a PATCH-style nullable field: without this,
/// `Option<Option<T>>` cannot tell "key absent" (`None`, outer) from "key
/// present and explicitly `null`" (`Some(None)`) — a bare `null` collapses
/// straight to the outer `None` in both cases. Wrapping every present value
/// (including `null`, whose inner deserialize just yields `None`) in `Some`
/// preserves that distinction.
fn deserialize_present<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Deserialize::deserialize(deserializer).map(Some)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct DocRow {
    pub doc_id: String,
    pub doc_kind: String,
    pub profile_id: String,
    pub series_epoch: i64,
    pub doc_seq: Option<i64>,
    pub is_cancelled: bool,
    pub body: Json,
    pub created_at: String,
    pub updated_at: String,
    pub body_hash: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct DocDraft {
    pub doc_id: Option<String>,
    pub doc_kind: String,
    pub profile_id: Option<String>,
    pub is_cancelled: Option<bool>,
    pub body: Json,
}

/// Keyset cursor for `list_docs` — see `DocQuery::after`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct DocAfter {
    pub created_at: String,
    pub doc_id: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct DocQuery {
    pub doc_kind: Option<String>,
    pub profile_id: Option<String>,
    pub is_cancelled: Option<bool>,
    pub created_from: Option<String>,
    pub created_to: Option<String>,
    pub limit: Option<i64>,
    /// The last row's `created_at`/`doc_id` from a previous page, in
    /// `created_at DESC, doc_id DESC` order. `None` asks for page 1.
    pub after: Option<DocAfter>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct SeriesEpoch {
    pub epoch: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct MasterRow {
    pub master_id: String,
    pub master_kind: String,
    pub name: String,
    pub body: Json,
    pub is_active: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MasterDraft {
    pub master_id: Option<String>,
    pub master_kind: String,
    pub name: String,
    pub body: Json,
    pub is_active: Option<bool>,
}

/// Keyset cursor for `list_masters` — see `MasterQuery::after`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MasterAfter {
    pub name: String,
    pub master_id: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct MasterQuery {
    pub master_kind: Option<String>,
    pub is_active: Option<bool>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    /// The last row's `name`/`master_id` from a previous page, in
    /// `name COLLATE NOCASE ASC` order. `None` asks for page 1.
    pub after: Option<MasterAfter>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ConfigRow {
    pub config_id: String,
    pub config_kind: String,
    pub body: Json,
    pub version: i64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ConfigDraft {
    pub config_id: Option<String>,
    pub config_kind: String,
    pub body: Json,
    pub version: Option<i64>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ConfigQuery {
    pub config_kind: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct AssetMetaRow {
    pub asset_id: String,
    pub asset_kind: String,
    pub owner_id: Option<String>,
    pub mime_type: String,
    pub size_bytes: i64,
    pub sha256: String,
    pub meta: Json,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AssetDraft {
    pub asset_id: Option<String>,
    pub asset_kind: String,
    pub owner_id: Option<String>,
    pub mime_type: String,
    /// Tauri's `invoke()` JSON-serialises this as a plain number array —
    /// fine at demo/site-image sizes; a byte-stream IPC path is future work
    /// if asset sizes ever make that costly (app/README.md known gap).
    pub bytes: Vec<u8>,
    pub meta: Option<Json>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuditRow {
    pub audit_id: String,
    pub at: String,
    pub actor: String,
    pub action: String,
    pub target: Option<String>,
    pub body: Json,
    pub row_hash: String,
    pub prev_hash: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuditDraft {
    pub actor: String,
    pub action: String,
    pub target: Option<String>,
    pub body: Json,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AuditQuery {
    pub target: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub limit: Option<i64>,
}

/// Result of `audit::verify_chain` — whether the whole ledger's hash chain
/// is unbroken, and where it first isn't if not. Drives the QR verification
/// page's trust badge (PLAN §18, net/mod.rs).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ChainVerification {
    pub intact: bool,
    pub checked: i64,
    pub broken_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct OutboxRow {
    pub outbox_id: String,
    pub channel: String,
    pub body: Json,
    pub attempts: i64,
    pub next_try_at: Option<String>,
    pub state: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OutboxDraft {
    pub channel: String,
    pub body: Json,
    pub next_try_at: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OutboxQuery {
    pub state: Option<String>,
    pub channel: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OutboxPatch {
    pub attempts: Option<i64>,
    #[serde(default, deserialize_with = "deserialize_present")]
    pub next_try_at: Option<Option<String>>,
    pub state: Option<String>,
}
