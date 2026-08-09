//! Mirrors `src/db/adapters/memory/outbox.ts`.

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{OutboxDraft, OutboxPatch, OutboxQuery, OutboxRow};
use super::ids::new_id;
use crate::error::AppError;

fn row_to_outbox(row: &Row) -> rusqlite::Result<OutboxRow> {
    let body_text: String = row.get("body")?;
    Ok(OutboxRow {
        outbox_id: row.get("outbox_id")?,
        channel: row.get("channel")?,
        body: serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null),
        attempts: row.get("attempts")?,
        next_try_at: row.get("next_try_at")?,
        state: row.get("state")?,
    })
}

const SELECT_OUTBOX: &str =
    "SELECT outbox_id, channel, body, attempts, next_try_at, state FROM outbox";

fn get_outbox(conn: &Connection, outbox_id: &str) -> Result<Option<OutboxRow>, AppError> {
    let sql = format!("{SELECT_OUTBOX} WHERE outbox_id = ?1");
    Ok(conn
        .query_row(&sql, params![outbox_id], row_to_outbox)
        .optional()?)
}

pub fn enqueue_outbox(conn: &Connection, draft: &OutboxDraft) -> Result<OutboxRow, AppError> {
    let outbox_id = new_id();
    let body_text =
        serde_json::to_string(&draft.body).map_err(|e| AppError::Message(e.to_string()))?;
    conn.execute(
        "INSERT INTO outbox (outbox_id, channel, body, attempts, next_try_at, state)
         VALUES (?1, ?2, ?3, 0, ?4, 'Pending')",
        params![outbox_id, draft.channel, body_text, draft.next_try_at],
    )?;
    get_outbox(conn, &outbox_id)?
        .ok_or_else(|| AppError::Message("enqueueOutbox: row vanished after write".into()))
}

pub fn list_outbox(conn: &Connection, query: &OutboxQuery) -> Result<Vec<OutboxRow>, AppError> {
    let mut sql = SELECT_OUTBOX.to_string();
    let mut clauses = Vec::new();
    if query.state.is_some() {
        clauses.push("state = :state");
    }
    if query.channel.is_some() {
        clauses.push("channel = :channel");
    }
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    let mut statement = conn.prepare(&sql)?;
    let mut named = Vec::<(&str, &dyn rusqlite::ToSql)>::new();
    if let Some(v) = &query.state {
        named.push((":state", v));
    }
    if let Some(v) = &query.channel {
        named.push((":channel", v));
    }
    let rows = statement
        .query_map(named.as_slice(), row_to_outbox)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn update_outbox(
    conn: &Connection,
    outbox_id: &str,
    patch: &OutboxPatch,
) -> Result<OutboxRow, AppError> {
    let existing = get_outbox(conn, outbox_id)?
        .ok_or_else(|| AppError::Message(format!("updateOutbox: no entry {outbox_id}")))?;

    let attempts = patch.attempts.unwrap_or(existing.attempts);
    // `Some(None)` means "explicitly set to null"; `None` (key absent) keeps
    // the existing value — see dto.rs's `deserialize_present`.
    let next_try_at = match &patch.next_try_at {
        Some(explicit) => explicit.clone(),
        None => existing.next_try_at.clone(),
    };
    let state = patch.state.clone().unwrap_or(existing.state);

    conn.execute(
        "UPDATE outbox SET attempts = ?1, next_try_at = ?2, state = ?3 WHERE outbox_id = ?4",
        params![attempts, next_try_at, state, outbox_id],
    )?;
    get_outbox(conn, outbox_id)?
        .ok_or_else(|| AppError::Message("updateOutbox: row vanished after write".into()))
}
