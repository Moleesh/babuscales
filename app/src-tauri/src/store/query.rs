//! Shared "push clause + named param, join with AND" helper.
//!
//! `masters`/`configs`/`docs`/`audit` each hand-built a `Vec<&str>` of WHERE
//! clause fragments alongside a parallel `Vec<(&str, &dyn ToSql)>` of named
//! params, checking the same `Option`s twice (once to decide whether to push
//! the clause text, once to decide whether to push the bound value) and
//! joining the clauses with `" AND "` before splicing them into the query
//! string. `QueryBuilder` collects both lists together so each `Option` is
//! only inspected once, and owns the bound values (boxed) so callers can
//! build one from short-lived locals (an escaped LIKE pattern, a `bool -> i64`
//! cast) without fighting borrow lifetimes.
//!
//! This is a pure textual/bookkeeping helper — it does not know about
//! pagination strategy (LIMIT/OFFSET vs. keyset cursor) or column names;
//! callers keep full control of clause SQL and ordering, and still append
//! their own `ORDER BY`/`LIMIT` after `where_sql()`.

use rusqlite::ToSql;

#[derive(Default)]
pub struct QueryBuilder<'a> {
    clauses: Vec<&'static str>,
    params: Vec<(&'static str, Box<dyn ToSql + 'a>)>,
}

impl<'a> QueryBuilder<'a> {
    pub fn new() -> Self {
        Self {
            clauses: Vec::new(),
            params: Vec::new(),
        }
    }

    /// Pushes `clause` (parameterised on `:name`) and the value bound to
    /// `:name` together, but only when `value` is `Some` — the single check
    /// standing in for the paired `if query.field.is_some() { clauses.push
    /// }` / `if let Some(v) = &query.field { named.push }` the store files
    /// used to repeat. `to_sql` converts the DTO's `&T` into whatever type
    /// actually gets bound (e.g. `bool -> i64`, or wrapping a search term as
    /// `%…%`).
    pub fn push_opt<T, V>(
        &mut self,
        value: &Option<T>,
        clause: &'static str,
        name: &'static str,
        to_sql: impl FnOnce(&T) -> V,
    ) where
        V: ToSql + 'a,
    {
        if let Some(v) = value {
            self.clauses.push(clause);
            self.params.push((name, Box::new(to_sql(v))));
        }
    }

    /// Pushes a clause with no `Option`-gating, for callers that already
    /// decided the clause applies (e.g. a keyset-cursor clause bound to
    /// multiple named params — see `push_param`).
    pub fn push_clause(&mut self, clause: &'static str) {
        self.clauses.push(clause);
    }

    /// Binds a value to `:name` without adding a clause — used alongside
    /// `push_clause` when one clause needs more than one bound param (the
    /// keyset cursor's `:after_name`/`:after_master_id`) or a clause's SQL
    /// text is appended separately (LIMIT/OFFSET, which live after
    /// `ORDER BY` rather than in the WHERE list).
    pub fn push_param(&mut self, name: &'static str, value: impl ToSql + 'a) {
        self.params.push((name, Box::new(value)));
    }

    /// `" WHERE a AND b"`, or `""` if nothing was pushed.
    pub fn where_sql(&self) -> String {
        if self.clauses.is_empty() {
            String::new()
        } else {
            format!(" WHERE {}", self.clauses.join(" AND "))
        }
    }

    /// The named-param slice `query_map`/`query_row` expect.
    pub fn bindings(&self) -> Vec<(&str, &dyn ToSql)> {
        self.params
            .iter()
            .map(|(name, value)| (*name, value.as_ref() as &dyn ToSql))
            .collect()
    }
}
