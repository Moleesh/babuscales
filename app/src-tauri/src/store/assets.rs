//! Mirrors `src/db/adapters/memory/assets.ts` — metadata and bytes stay two
//! separate reads, never one `SELECT *`, so listing an owner's assets never
//! drags every image through memory (PLAN §6.1's rule on the `asset` table).

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{AssetDraft, AssetMetaRow};
use super::hash::sha256_hex;
use super::ids::new_id;
use super::time::now_iso;
use crate::error::AppError;

fn row_to_meta(row: &Row) -> rusqlite::Result<AssetMetaRow> {
    let meta_text: String = row.get("meta")?;
    Ok(AssetMetaRow {
        asset_id: row.get("asset_id")?,
        asset_kind: row.get("asset_kind")?,
        owner_id: row.get("owner_id")?,
        mime_type: row.get("mime_type")?,
        size_bytes: row.get("size_bytes")?,
        sha256: row.get("sha256")?,
        meta: serde_json::from_str(&meta_text).unwrap_or(serde_json::Value::Null),
        created_at: row.get("created_at")?,
    })
}

const SELECT_META: &str =
    "SELECT asset_id, asset_kind, owner_id, mime_type, size_bytes, sha256, meta, created_at FROM asset";

pub fn get_asset_meta(conn: &Connection, asset_id: &str) -> Result<Option<AssetMetaRow>, AppError> {
    let sql = format!("{SELECT_META} WHERE asset_id = ?1");
    Ok(conn
        .query_row(&sql, params![asset_id], row_to_meta)
        .optional()?)
}

pub fn get_asset_bytes(conn: &Connection, asset_id: &str) -> Result<Option<Vec<u8>>, AppError> {
    Ok(conn
        .query_row(
            "SELECT bytes FROM asset WHERE asset_id = ?1",
            params![asset_id],
            |row| row.get(0),
        )
        .optional()?)
}

pub fn list_asset_meta(conn: &Connection, owner_id: &str) -> Result<Vec<AssetMetaRow>, AppError> {
    let sql = format!("{SELECT_META} WHERE owner_id = ?1 ORDER BY created_at DESC");
    let mut statement = conn.prepare(&sql)?;
    let rows = statement
        .query_map(params![owner_id], row_to_meta)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn put_asset(conn: &Connection, draft: &AssetDraft) -> Result<AssetMetaRow, AppError> {
    let asset_id = draft.asset_id.clone().unwrap_or_else(new_id);
    let created_at = now_iso();
    let sha256 = sha256_hex(&draft.bytes);
    let size_bytes = draft.bytes.len() as i64;
    let meta = draft.meta.clone().unwrap_or_else(|| serde_json::json!({}));
    let meta_text = serde_json::to_string(&meta).map_err(|e| AppError::Message(e.to_string()))?;

    // Matches the memory adapter's `state.assets.set(row.AssetId, row)`: a
    // `putAsset` reusing an existing `AssetId` overwrites the row wholesale,
    // `CreatedAt` included — not exercised anywhere yet (no caller passes an
    // existing id), kept for behavioural parity between adapters.
    conn.execute(
        "INSERT INTO asset (asset_id, asset_kind, owner_id, mime_type, bytes, size_bytes, sha256, meta, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(asset_id) DO UPDATE SET
           asset_kind = excluded.asset_kind, owner_id = excluded.owner_id, mime_type = excluded.mime_type,
           bytes = excluded.bytes, size_bytes = excluded.size_bytes, sha256 = excluded.sha256,
           meta = excluded.meta, created_at = excluded.created_at",
        params![
            asset_id,
            draft.asset_kind,
            draft.owner_id,
            draft.mime_type,
            draft.bytes,
            size_bytes,
            sha256,
            meta_text,
            created_at,
        ],
    )?;

    get_asset_meta(conn, &asset_id)?
        .ok_or_else(|| AppError::Message("putAsset: row vanished after write".into()))
}
