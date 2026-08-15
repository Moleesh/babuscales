//! Mirrors `src/db/adapters/memory/docs.ts` exactly — same fields, same
//! `allocateDocSeq`/`resetDocSeries` semantics — just against `doc` instead
//! of a `Map`. PLAN §6.1: ticket numbers are allocated inside `BEGIN
//! IMMEDIATE`, at close, never at draft.

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{DocDraft, DocQuery, DocRow, SeriesEpoch};
use super::hash::hash_body;
use super::ids::new_id;
use super::time::now_iso;
use crate::error::AppError;

fn row_to_doc(row: &Row) -> rusqlite::Result<DocRow> {
    let body_text: String = row.get("body")?;
    Ok(DocRow {
        doc_id: row.get("doc_id")?,
        doc_kind: row.get("doc_kind")?,
        profile_id: row.get("profile_id")?,
        series_epoch: row.get("series_epoch")?,
        doc_seq: row.get("doc_seq")?,
        is_cancelled: row.get::<_, i64>("is_cancelled")? != 0,
        body: serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null),
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        body_hash: row.get("body_hash")?,
    })
}

const SELECT_DOC: &str = "SELECT doc_id, doc_kind, profile_id, series_epoch, doc_seq, is_cancelled, body, created_at, updated_at, body_hash FROM doc";

pub fn get_doc(conn: &Connection, doc_id: &str) -> Result<Option<DocRow>, AppError> {
    let sql = format!("{SELECT_DOC} WHERE doc_id = ?1");
    Ok(conn
        .query_row(&sql, params![doc_id], row_to_doc)
        .optional()?)
}

pub fn list_docs(conn: &Connection, query: &DocQuery) -> Result<Vec<DocRow>, AppError> {
    let mut sql = SELECT_DOC.to_string();
    let mut clauses = Vec::new();
    if query.doc_kind.is_some() {
        clauses.push("doc_kind = :doc_kind");
    }
    if query.profile_id.is_some() {
        clauses.push("profile_id = :profile_id");
    }
    if query.is_cancelled.is_some() {
        clauses.push("is_cancelled = :is_cancelled");
    }
    if query.created_from.is_some() {
        clauses.push("created_at >= :created_from");
    }
    if query.created_to.is_some() {
        clauses.push("created_at <= :created_to");
    }
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    sql.push_str(" ORDER BY created_at DESC");
    if let Some(limit) = query.limit {
        sql.push_str(" LIMIT :limit OFFSET :offset");
        let _ = limit; // bound below alongside offset
    }

    let mut statement = conn.prepare(&sql)?;
    let mut named = Vec::<(&str, &dyn rusqlite::ToSql)>::new();
    if let Some(v) = &query.doc_kind {
        named.push((":doc_kind", v));
    }
    if let Some(v) = &query.profile_id {
        named.push((":profile_id", v));
    }
    let is_cancelled_int = query.is_cancelled.map(|b| b as i64);
    if let Some(v) = &is_cancelled_int {
        named.push((":is_cancelled", v));
    }
    if let Some(v) = &query.created_from {
        named.push((":created_from", v));
    }
    if let Some(v) = &query.created_to {
        named.push((":created_to", v));
    }
    let offset = query.offset.unwrap_or(0);
    if let Some(limit) = &query.limit {
        named.push((":limit", limit));
        named.push((":offset", &offset));
    }

    let rows = statement
        .query_map(named.as_slice(), row_to_doc)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn save_doc(conn: &Connection, draft: &DocDraft) -> Result<DocRow, AppError> {
    let existing = match &draft.doc_id {
        Some(id) => get_doc(conn, id)?,
        None => None,
    };
    let profile_id = draft
        .profile_id
        .clone()
        .or_else(|| existing.as_ref().map(|d| d.profile_id.clone()))
        .unwrap_or_else(|| "default".to_string());
    let epoch = match &existing {
        Some(doc) => doc.series_epoch,
        None => current_series_epoch(conn, &draft.doc_kind, &profile_id)?,
    };
    let doc_id = existing
        .as_ref()
        .map(|d| d.doc_id.clone())
        .or_else(|| draft.doc_id.clone())
        .unwrap_or_else(new_id);
    let is_cancelled = draft
        .is_cancelled
        .or_else(|| existing.as_ref().map(|d| d.is_cancelled))
        .unwrap_or(false);
    let created_at = existing
        .as_ref()
        .map(|d| d.created_at.clone())
        .unwrap_or_else(now_iso);
    let updated_at = now_iso();
    let body_hash = hash_body(&draft.body)?;
    let body_text =
        serde_json::to_string(&draft.body).map_err(|e| AppError::Message(e.to_string()))?;

    conn.execute(
        "INSERT INTO doc (doc_id, doc_kind, profile_id, series_epoch, doc_seq, is_cancelled, body, created_at, updated_at, body_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(doc_id) DO UPDATE SET
           doc_kind = excluded.doc_kind, profile_id = excluded.profile_id, is_cancelled = excluded.is_cancelled,
           body = excluded.body, updated_at = excluded.updated_at, body_hash = excluded.body_hash",
        params![
            doc_id,
            draft.doc_kind,
            profile_id,
            epoch,
            existing.as_ref().and_then(|d| d.doc_seq),
            is_cancelled as i64,
            body_text,
            created_at,
            updated_at,
            body_hash,
        ],
    )?;

    get_doc(conn, &doc_id)?
        .ok_or_else(|| AppError::Message("saveDoc: row vanished after write".into()))
}

/// PLAN §6.1 — the allocation group is `(doc_kind, profile_id, series_epoch)`,
/// the same triple `ux_doc_seq` covers. `BEGIN IMMEDIATE` (via rusqlite's
/// default transaction behaviour, set below) takes the write lock up front
/// so two processes racing this on the same file can't both compute the
/// same next number.
pub fn allocate_doc_seq(conn: &mut Connection, doc_id: &str) -> Result<DocRow, AppError> {
    let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
    let doc = {
        let sql = format!("{SELECT_DOC} WHERE doc_id = ?1");
        tx.query_row(&sql, params![doc_id], row_to_doc).optional()?
    }
    .ok_or_else(|| AppError::Message(format!("allocateDocSeq: no doc {doc_id}")))?;

    if doc.doc_seq.is_some() {
        tx.commit()?;
        return Ok(doc);
    }

    let next_seq: i64 = tx.query_row(
        "SELECT COALESCE(MAX(doc_seq), (SELECT start_seq FROM series_counter WHERE doc_kind = ?1 AND profile_id = ?2) - 1, 0) + 1
         FROM doc WHERE doc_kind = ?1 AND profile_id = ?2 AND series_epoch = ?3",
        params![doc.doc_kind, doc.profile_id, doc.series_epoch],
        |row| row.get(0),
    )?;
    let updated_at = now_iso();
    tx.execute(
        "UPDATE doc SET doc_seq = ?1, updated_at = ?2 WHERE doc_id = ?3",
        params![next_seq, updated_at, doc_id],
    )?;
    let updated = {
        let sql = format!("{SELECT_DOC} WHERE doc_id = ?1");
        tx.query_row(&sql, params![doc_id], row_to_doc).optional()?
    }
    .ok_or_else(|| AppError::Message("allocateDocSeq: row vanished mid-transaction".into()))?;
    tx.commit()?;
    Ok(updated)
}

fn current_series_epoch(
    conn: &Connection,
    doc_kind: &str,
    profile_id: &str,
) -> Result<i64, AppError> {
    Ok(conn
        .query_row(
            "SELECT epoch FROM series_counter WHERE doc_kind = ?1 AND profile_id = ?2",
            params![doc_kind, profile_id],
            |row| row.get(0),
        )
        .optional()?
        .unwrap_or(0))
}

/// Bumps the numbering epoch so the next allocation — and the next brand
/// new doc's starting epoch, via `current_series_epoch` above — restarts
/// from the bumped value. `start_seq` is the operator-chosen first number
/// for the new epoch (defaults to 1 at the call site); `allocate_doc_seq`
/// uses it as the floor once the new epoch has no docs of its own yet.
pub fn reset_doc_series(
    conn: &Connection,
    doc_kind: &str,
    profile_id: &str,
    start_seq: i64,
) -> Result<SeriesEpoch, AppError> {
    conn.execute(
        "INSERT INTO series_counter (doc_kind, profile_id, epoch, start_seq) VALUES (?1, ?2, 1, ?3)
         ON CONFLICT(doc_kind, profile_id) DO UPDATE SET epoch = epoch + 1, start_seq = excluded.start_seq",
        params![doc_kind, profile_id, start_seq],
    )?;
    let epoch = current_series_epoch(conn, doc_kind, profile_id)?;
    Ok(SeriesEpoch { epoch })
}
