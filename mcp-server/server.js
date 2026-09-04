#!/usr/bin/env node
// A read-only MCP server over BabuScales' own SQLite database.
//
// This is NOT a replacement for the Tauri commands in
// app/src-tauri/src/commands/*.rs — those remain the app's real API, called
// in-process by the React frontend via Tauri IPC, and stay the only way to
// *write* anything (save a ticket, save a master, print, license...). This
// server only ever reads, from its own separate read-only connection, so an
// MCP client (Claude Desktop, Claude Code, any other MCP-speaking agent) can
// ask questions about the site's data without going through the desktop UI.
//
// Deliberately narrow: a handful of lookup/report tools, not a mechanical
// port of every command. See mcp-server/README.md for the reasoning and for
// what's intentionally left out (writes, device control, licensing).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";

// Windows sets %APPDATA%; falling back to the conventional path covers a
// shell that doesn't forward it. This is the exact path
// app/src-tauri/src/lib.rs resolves via Tauri's app_data_dir() at startup —
// keep the two in sync if that ever changes.
const APP_DATA = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
const DB_PATH = path.join(APP_DATA, "com.babulens.babuscales", "babuscales.db");

let db;
try {
  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
} catch (err) {
  console.error(
    `[babuscales-mcp] Could not open ${DB_PATH} read-only: ${err.message}\n` +
      "Has BabuScales been run at least once on this machine?"
  );
  process.exit(1);
}

const server = new McpServer({ name: "babuscales", version: "1.0.0" });

const ticketRowToSummary = (r) => {
  const body = JSON.parse(r.body);
  const captures = Array.isArray(body.Captures) ? body.Captures : [];
  const weightOf = (kind) => captures.find((c) => c.Type === kind)?.WeightKg ?? null;
  const tareKg = weightOf("Tare");
  const grossKg = weightOf("Gross");
  return {
    docId: r.doc_id,
    docSeq: r.doc_seq,
    isCancelled: !!r.is_cancelled,
    vehicleNo: body.VehicleNo ?? null,
    party: body.Party ?? null,
    material: body.Material ?? null,
    transporter: body.Transporter ?? null,
    challanNo: body.ChallanNo ?? null,
    tareKg,
    grossKg,
    netKg: tareKg != null && grossKg != null ? Math.abs(grossKg - tareKg) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

server.registerTool(
  "list_tickets",
  {
    title: "List BabuScales weighbridge tickets",
    description:
      "List weighment ticket documents, most recent first — mirrors the app's own list_docs Tauri command (doc_kind='Ticket').",
    inputSchema: {
      is_cancelled: z.boolean().optional().describe("Filter to cancelled or non-cancelled tickets."),
      vehicle_no: z.string().optional().describe("Exact vehicle number match."),
      limit: z.number().int().positive().max(200).optional().default(20),
    },
  },
  async ({ is_cancelled, vehicle_no, limit }) => {
    let sql = "SELECT doc_id, doc_seq, is_cancelled, body, created_at, updated_at FROM doc WHERE doc_kind = 'Ticket'";
    const params = [];
    if (is_cancelled !== undefined) {
      sql += " AND is_cancelled = ?";
      params.push(is_cancelled ? 1 : 0);
    }
    if (vehicle_no) {
      sql += " AND json_extract(body, '$.VehicleNo') = ?";
      params.push(vehicle_no);
    }
    sql += " ORDER BY created_at DESC, doc_id DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(sql).all(...params).map(ticketRowToSummary);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }
);

server.registerTool(
  "get_ticket",
  {
    title: "Get one BabuScales ticket by id",
    description: "Fetch a single weighment ticket's full detail by its doc_id.",
    inputSchema: {
      doc_id: z.string().describe("The ticket's doc_id, as returned by list_tickets."),
    },
  },
  async ({ doc_id }) => {
    const row = db
      .prepare("SELECT doc_id, doc_seq, is_cancelled, body, created_at, updated_at FROM doc WHERE doc_id = ? AND doc_kind = 'Ticket'")
      .get(doc_id);
    if (!row) {
      return { content: [{ type: "text", text: `No ticket found with doc_id ${doc_id}` }], isError: true };
    }
    const summary = ticketRowToSummary(row);
    const body = JSON.parse(row.body);
    return { content: [{ type: "text", text: JSON.stringify({ ...summary, captures: body.Captures ?? [] }, null, 2) }] };
  }
);

server.registerTool(
  "list_masters",
  {
    title: "List BabuScales masters",
    description: "List active master records (Party/Vehicle/Transporter/Material) — mirrors the app's list_masters Tauri command.",
    inputSchema: {
      master_kind: z
        .enum(["Party", "Vehicle", "Transporter", "Material"])
        .optional()
        .describe("Filter to one master kind. Omit to list all kinds."),
      search: z.string().optional().describe("Case-insensitive substring match on name."),
      limit: z.number().int().positive().max(200).optional().default(50),
    },
  },
  async ({ master_kind, search, limit }) => {
    let sql = "SELECT master_id, master_kind, name, body, updated_at FROM master WHERE is_active = 1";
    const params = [];
    if (master_kind) {
      sql += " AND master_kind = ?";
      params.push(master_kind);
    }
    if (search) {
      sql += " AND name LIKE ? ESCAPE '\\'";
      params.push(`%${search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`);
    }
    sql += " ORDER BY name COLLATE NOCASE ASC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(sql).all(...params).map((r) => ({
      masterId: r.master_id,
      masterKind: r.master_kind,
      name: r.name,
      body: JSON.parse(r.body),
      updatedAt: r.updated_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  }
);

server.registerTool(
  "dashboard_summary",
  {
    title: "BabuScales dashboard summary",
    description: "Quick counts: total/cancelled tickets, tickets today, and master counts by kind — a fast overview without listing every row.",
    inputSchema: {},
  },
  async () => {
    const ticketTotals = db
      .prepare(
        "SELECT COUNT(*) AS total, SUM(is_cancelled) AS cancelled FROM doc WHERE doc_kind = 'Ticket'"
      )
      .get();
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = db
      .prepare(
        "SELECT COUNT(*) AS n FROM doc WHERE doc_kind = 'Ticket' AND substr(created_at, 1, 10) = ?"
      )
      .get(today).n;
    const mastersByKind = db
      .prepare("SELECT master_kind, COUNT(*) AS n FROM master WHERE is_active = 1 GROUP BY master_kind")
      .all();

    const summary = {
      tickets: {
        total: ticketTotals.total,
        cancelled: ticketTotals.cancelled ?? 0,
        today: todayCount,
      },
      masters: Object.fromEntries(mastersByKind.map((r) => [r.master_kind, r.n])),
    };
    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
