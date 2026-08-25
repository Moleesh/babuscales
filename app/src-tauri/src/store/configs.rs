//! Mirrors `src/db/adapters/memory/configs.ts`.

use rusqlite::{params, Connection, OptionalExtension, Row};

use super::dto::{ConfigDraft, ConfigQuery, ConfigRow};
use super::ids::new_id;
use super::time::now_iso;
use crate::error::AppError;

fn row_to_config(row: &Row) -> rusqlite::Result<ConfigRow> {
    let body_text: String = row.get("body")?;
    Ok(ConfigRow {
        config_id: row.get("config_id")?,
        config_kind: row.get("config_kind")?,
        body: serde_json::from_str(&body_text).unwrap_or(serde_json::Value::Null),
        version: row.get("version")?,
        updated_at: row.get("updated_at")?,
    })
}

const SELECT_CONFIG: &str = "SELECT config_id, config_kind, body, version, updated_at FROM config";

pub fn get_config(conn: &Connection, config_id: &str) -> Result<Option<ConfigRow>, AppError> {
    let sql = format!("{SELECT_CONFIG} WHERE config_id = ?1");
    Ok(conn
        .query_row(&sql, params![config_id], row_to_config)
        .optional()?)
}

pub fn list_config(conn: &Connection, query: &ConfigQuery) -> Result<Vec<ConfigRow>, AppError> {
    let mut sql = SELECT_CONFIG.to_string();
    if query.config_kind.is_some() {
        sql.push_str(" WHERE config_kind = :config_kind");
    }
    let mut statement = conn.prepare(&sql)?;
    let mut named = Vec::<(&str, &dyn rusqlite::ToSql)>::new();
    if let Some(v) = &query.config_kind {
        named.push((":config_kind", v));
    }
    let rows = statement
        .query_map(named.as_slice(), row_to_config)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

// Hard delete — task: "delete the package" (a language pack an admin adds
// via Settings → Language, `ConfigKind: "LanguagePack"`, `config_id` from
// `languagePackConfigId`) needed a real way to go away rather than just
// being overwritten with new content. Same shape as `delete_master`: no
// other table has an FK into `config`, so nothing else needs to change.
pub fn delete_config(conn: &Connection, config_id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM config WHERE config_id = ?1", params![config_id])?;
    Ok(())
}

pub fn save_config(conn: &Connection, draft: &ConfigDraft) -> Result<ConfigRow, AppError> {
    let existing = match &draft.config_id {
        Some(id) => get_config(conn, id)?,
        None => None,
    };
    let config_id = existing
        .as_ref()
        .map(|c| c.config_id.clone())
        .or_else(|| draft.config_id.clone())
        .unwrap_or_else(new_id);
    let version = draft
        .version
        .unwrap_or_else(|| existing.as_ref().map(|c| c.version + 1).unwrap_or(1));
    let updated_at = now_iso();
    let body_text =
        serde_json::to_string(&draft.body).map_err(|e| AppError::Message(e.to_string()))?;

    conn.execute(
        "INSERT INTO config (config_id, config_kind, body, version, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(config_id) DO UPDATE SET
           config_kind = excluded.config_kind, body = excluded.body, version = excluded.version, updated_at = excluded.updated_at",
        params![config_id, draft.config_kind, body_text, version, updated_at],
    )?;

    get_config(conn, &config_id)?
        .ok_or_else(|| AppError::Message("saveConfig: row vanished after write".into()))
}
