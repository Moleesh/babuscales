//! Mirrors `src/db/adapters/memory/masters.ts`.

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{MasterDraft, MasterQuery, MasterRow};
use super::ids::new_id;
use super::time::now_iso;
use crate::error::AppError;

fn row_to_master(row: &Row) -> rusqlite::Result<MasterRow> {
    let body_text: String = row.get("body")?;
    Ok(MasterRow {
        master_id: row.get("master_id")?,
        master_kind: row.get("master_kind")?,
        name: row.get("name")?,
        body: serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null),
        is_active: row.get::<_, i64>("is_active")? != 0,
        updated_at: row.get("updated_at")?,
    })
}

const SELECT_MASTER: &str =
    "SELECT master_id, master_kind, name, body, is_active, updated_at FROM master";

pub fn get_master(conn: &Connection, master_id: &str) -> Result<Option<MasterRow>, AppError> {
    let sql = format!("{SELECT_MASTER} WHERE master_id = ?1");
    Ok(conn
        .query_row(&sql, params![master_id], row_to_master)
        .optional()?)
}

pub fn list_masters(conn: &Connection, query: &MasterQuery) -> Result<Vec<MasterRow>, AppError> {
    let mut sql = SELECT_MASTER.to_string();
    let mut clauses = Vec::new();
    if query.master_kind.is_some() {
        clauses.push("master_kind = :master_kind");
    }
    if query.is_active.is_some() {
        clauses.push("is_active = :is_active");
    }
    // SQLite's `LIKE` is ASCII-case-insensitive by default, matching the
    // memory adapter's `toLowerCase().includes(...)` closely enough for a
    // substring search over master names.
    if query.search.is_some() {
        clauses.push("name LIKE :search");
    }
    if !clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&clauses.join(" AND "));
    }
    sql.push_str(" ORDER BY name COLLATE NOCASE ASC");
    if query.limit.is_some() {
        sql.push_str(" LIMIT :limit");
    }

    let mut statement = conn.prepare(&sql)?;
    let mut named = Vec::<(&str, &dyn rusqlite::ToSql)>::new();
    if let Some(v) = &query.master_kind {
        named.push((":master_kind", v));
    }
    let is_active_int = query.is_active.map(|b| b as i64);
    if let Some(v) = &is_active_int {
        named.push((":is_active", v));
    }
    let search_pattern = query.search.as_ref().map(|s| format!("%{s}%"));
    if let Some(v) = &search_pattern {
        named.push((":search", v));
    }
    if let Some(limit) = &query.limit {
        named.push((":limit", limit));
    }

    let rows = statement
        .query_map(named.as_slice(), row_to_master)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn save_master(conn: &Connection, draft: &MasterDraft) -> Result<MasterRow, AppError> {
    let existing = match &draft.master_id {
        Some(id) => get_master(conn, id)?,
        None => None,
    };
    let master_id = existing
        .as_ref()
        .map(|m| m.master_id.clone())
        .or_else(|| draft.master_id.clone())
        .unwrap_or_else(new_id);
    let is_active = draft
        .is_active
        .or_else(|| existing.as_ref().map(|m| m.is_active))
        .unwrap_or(true);
    let updated_at = now_iso();
    let body_text =
        serde_json::to_string(&draft.body).map_err(|e| AppError::Message(e.to_string()))?;

    conn.execute(
        "INSERT INTO master (master_id, master_kind, name, body, is_active, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(master_id) DO UPDATE SET
           master_kind = excluded.master_kind, name = excluded.name, body = excluded.body,
           is_active = excluded.is_active, updated_at = excluded.updated_at",
        params![
            master_id,
            draft.master_kind,
            draft.name,
            body_text,
            is_active as i64,
            updated_at
        ],
    )?;

    get_master(conn, &master_id)?
        .ok_or_else(|| AppError::Message("saveMaster: row vanished after write".into()))
}
