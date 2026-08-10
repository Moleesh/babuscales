//! Mirrors `src/db/adapters/memory/audit.ts` — append-only, each row's hash
//! mixes in the previous row's, so altering any past entry breaks every
//! hash after it. `BEGIN IMMEDIATE` around read-last-then-insert for the
//! same reason `allocate_doc_seq` uses it: two processes racing this must
//! not both compute a chain link from the same "previous" row.

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{AuditDraft, AuditQuery, AuditRow, ChainVerification};
use super::hash::hash_audit_row;
use super::ids::new_id;
use super::time::now_iso;
use crate::error::AppError;

fn row_to_audit(row: &Row) -> rusqlite::Result<AuditRow> {
    let body_text: String = row.get("body")?;
    Ok(AuditRow {
        audit_id: row.get("audit_id")?,
        at: row.get("at")?,
        actor: row.get("actor")?,
        action: row.get("action")?,
        target: row.get("target")?,
        body: serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null),
        row_hash: row.get("row_hash")?,
        prev_hash: row.get("prev_hash")?,
    })
}

const SELECT_AUDIT: &str =
    "SELECT audit_id, at, actor, action, target, body, row_hash, prev_hash FROM audit";

pub fn append_audit(conn: &mut Connection, draft: &AuditDraft) -> Result<AuditRow, AppError> {
    let tx = conn.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;

    let prev_hash: Option<String> = tx
        .query_row(
            "SELECT row_hash FROM audit ORDER BY rowid DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?;

    let at = now_iso();
    let content = serde_json::json!({
        "Actor": draft.actor,
        "Action": draft.action,
        "Target": draft.target,
        "Body": draft.body,
        "At": at,
    });
    let row_hash = hash_audit_row(&content, prev_hash.as_deref())?;
    let audit_id = new_id();
    let body_text =
        serde_json::to_string(&draft.body).map_err(|e| AppError::Message(e.to_string()))?;

    tx.execute(
        "INSERT INTO audit (audit_id, at, actor, action, target, body, row_hash, prev_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            audit_id,
            at,
            draft.actor,
            draft.action,
            draft.target,
            body_text,
            row_hash,
            prev_hash
        ],
    )?;
    tx.commit()?;

    Ok(AuditRow {
        audit_id,
        at,
        actor: draft.actor.clone(),
        action: draft.action.clone(),
        target: draft.target.clone(),
        body: draft.body.clone(),
        row_hash,
        prev_hash,
    })
}

/// Walks the whole ledger oldest-to-newest, recomputing each row's hash from
/// its own content and the *previous row's stored hash*, and confirms both
/// that recomputation matches what's on disk and that the chain pointer
/// (`prev_hash`) itself wasn't rewritten. A single altered row — anywhere,
/// not just on the ticket being viewed — breaks every hash after it, which
/// is the whole point of the chain living here and not on `doc` (PLAN §18).
/// Returns the id of the first row that fails, if any. `O(n)` in the number
/// of audit rows — fine at the sizes this runs at (recomputing one SHA-256
/// per row on a scan/print event, not a hot path); revisit with a periodic
/// checkpoint if a single quarry's ledger ever grows large enough to make a
/// full walk on every QR scan noticeable (app/README.md known gap).
pub fn verify_chain(conn: &Connection) -> Result<ChainVerification, AppError> {
    let mut statement = conn.prepare(
        "SELECT audit_id, at, actor, action, target, body, row_hash, prev_hash FROM audit ORDER BY rowid ASC",
    )?;
    let rows = statement
        .query_map([], row_to_audit)?
        .collect::<Result<Vec<_>, _>>()?;

    let mut expected_prev: Option<String> = None;
    for row in &rows {
        if row.prev_hash != expected_prev {
            return Ok(ChainVerification {
                intact: false,
                checked: rows.len() as i64,
                broken_at: Some(row.audit_id.clone()),
            });
        }
        let content = serde_json::json!({
            "Actor": row.actor,
            "Action": row.action,
            "Target": row.target,
            "Body": row.body,
            "At": row.at,
        });
        let recomputed = hash_audit_row(&content, expected_prev.as_deref())?;
        if recomputed != row.row_hash {
            return Ok(ChainVerification {
                intact: false,
                checked: rows.len() as i64,
                broken_at: Some(row.audit_id.clone()),
            });
        }
        expected_prev = Some(row.row_hash.clone());
    }
    Ok(ChainVerification {
        intact: true,
        checked: rows.len() as i64,
        broken_at: None,
    })
}

pub fn list_audit(conn: &Connection, query: &AuditQuery) -> Result<Vec<AuditRow>, AppError> {
    let mut sql = SELECT_AUDIT.to_string();
    let mut clauses = Vec::new();
    if query.target.is_some() {
        clauses.push("target = :target");
    }
    if query.from.is_some() {
        clauses.push("at >= :from");
    }
    if query.to.is_some() {
        clauses.push("at <= :to");
    }
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    // Newest first — matches the memory adapter's `.slice().reverse()`.
    sql.push_str(" ORDER BY rowid DESC");
    if query.limit.is_some() {
        sql.push_str(" LIMIT :limit");
    }

    let mut statement = conn.prepare(&sql)?;
    let mut named = Vec::<(&str, &dyn rusqlite::ToSql)>::new();
    if let Some(v) = &query.target {
        named.push((":target", v));
    }
    if let Some(v) = &query.from {
        named.push((":from", v));
    }
    if let Some(v) = &query.to {
        named.push((":to", v));
    }
    if let Some(limit) = &query.limit {
        named.push((":limit", limit));
    }

    let rows = statement
        .query_map(named.as_slice(), row_to_audit)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}
