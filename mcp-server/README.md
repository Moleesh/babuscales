# babuscales-mcp-server

A small, **read-only** MCP server over BabuScales' own SQLite database, so an
MCP-speaking client (Claude Desktop, Claude Code, any other agent) can look
up weighbridge data directly instead of going through the desktop app's UI.

## What this is not

This does **not** replace the app's real API — the Tauri commands in
`app/src-tauri/src/commands/*.rs`, called in-process by the React frontend
over Tauri's IPC. Those remain the only way to *write* anything (save a
ticket, save a master, print, activate a licence, talk to the indicator or a
printer). Converting all of that to MCP was considered and rejected: most of
it is either write/side-effecting or hardware-facing, and an LLM able to
autonomously fire a print job or a serial command is a liability, not a
feature. This server covers a deliberately narrow slice — the handful of
lookups where "let an agent ask a question about the site's data" is an
actual, safe use case.

## Tools

| Tool | Does |
|---|---|
| `list_tickets` | Recent weighment tickets, optionally filtered by `is_cancelled` / `vehicle_no` |
| `get_ticket` | One ticket's full detail (including capture history) by `doc_id` |
| `list_masters` | Active Party/Vehicle/Transporter/Material masters, optionally filtered/searched |
| `dashboard_summary` | Quick counts — total/cancelled/today's tickets, master counts by kind |

Every tool opens its own **read-only** connection to the same
`%APPDATA%/com.babulens.babuscales/babuscales.db` file the desktop app
writes to (matching `app/src-tauri/src/lib.rs`'s `app_data_dir()` resolution)
and never writes to it.

## Running it

```bash
npm install
npm start        # runs the MCP server on stdio
npm test         # smoke-tests every tool via a throwaway MCP client
```

Requires BabuScales to have been run at least once on this machine (so
`babuscales.db` exists).

## Using it from an MCP client

This repo's root `.mcp.json` registers it as `babuscales` — Claude Code
picks it up automatically from this project. For Claude Desktop or another
client, point it at `node <path-to>/mcp-server/server.js`.
