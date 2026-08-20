# LAN read-only web portal — analysis & plan

> Status: **planned, not started.** No code changes yet — this is the scoping pass requested
> 2026-08-18 before committing engineering time. Cross-referenced from `PLAN.md` §21's
> "What's left" list; this file carries the full analysis, PLAN.md carries the one-line summary.

## 1. What's being asked for

Extend the existing LAN verification server (`app/src-tauri/src/net/mod.rs`, port 8420, already
shipping) so that any browser on the same network — not just a phone scanning a printed QR code —
can open the desktop app's own data, **read-only**, and print from the browser itself.

**In scope today:**
- **Dashboard** — read-only view of the same summary the desktop app's Dashboard screen shows.
- **Reports** — read-only, filterable ticket/summary views.
- **Masters** — read-only listing of Parties/Materials/Vehicles/Transporters etc.
- **Tickets** — list + detail, with **reprint** support (a print-styled page + `window.print()`).
- **Reports print** — same print-styled treatment as reprint.

**Explicitly deferred:**
- **Weight indicator / camera** live view — placeholder only, real work waits on the indicator/
  camera implementation itself (§21 "Real camera capture" is already a separately tracked,
  deferred-by-decision item; the live-weight browser view depends on it).
- **Write access of any kind** (new tickets, edits to masters/settings) — explicitly out of scope
  by the requester's own instruction. No auth is being added because nothing writable is exposed.
- **Public/internet reach** — already covered by the existing opt-in Cloudflare Tunnel
  (`net/tunnel.rs`); this plan only concerns what gets *served*, not how far it reaches.
- **APK/mobile app** — explicitly deferred. The requester's intent is that a future Android client
  becomes "just another client hitting the same endpoints" — this plan should avoid choices that
  would make that harder later (e.g. keep responses either plain HTML or something an embedded
  webview can render identically to a phone browser), but no mobile-specific work happens now.

## 2. Architecture decision

**Server-rendered HTML, extending the existing pattern — not a JSON API + SPA rebuild.**

Considered and rejected: serving the real React bundle (`app/dist`) plus a new HTTP JSON API and a
third `web` data-adapter alongside `memory`/`tauri` in `createDataPort.ts`. That is the only way to
get *write* access working in a browser, but for a **read-only, no-auth** surface it is
substantially more engineering (new API surface mirroring every `commands::*` Tauri command, a new
frontend build target, an auth layer even for "read-only" since exposing a write-capable API
implicitly needs one) for no corresponding benefit right now.

Instead: keep doing what `net/mod.rs` already does for the verification page — hand-written HTML
render functions (`render_ticket`, `page_shell`, `escape_html`) fed straight from the same
`store::` query functions the desktop commands call, added as new routes on the same `tiny_http`
server. This is the "smallest footprint that does the job" call the file's own doc comment already
commits to, extended rather than replaced.

**Runs inside the Tauri process, same lifecycle as today** — starts when "QR verification page" is
turned on (or a renamed equivalent — see §5, open question 1), stops when the app closes. No
second process, no separate service to install or supervise. Confirmed as the intended shape by
the requester.

## 3. What already exists to build on

| Piece | File | Reusable as-is? |
|---|---|---|
| Blocking HTTP server, thread lifecycle, LAN IP detection | `net/mod.rs:64-155` | Yes — routing table (`route()`) just needs more arms |
| HTML page shell + print-safe inline CSS | `net/mod.rs:423-470` (`page_shell`) | Yes — needs a `@media print` pass audited for reports/reprint, not just the ticket slip |
| Ticket detail rendering, verified/cancelled badge, photos | `net/mod.rs:253-411` (`verification_page`, `render_ticket`) | Yes, directly — becomes the reprint page with a print button added |
| Ticket query | `store/docs.rs: get_doc`, `list_docs(conn, &DocQuery)` | Yes |
| Master query | `store/masters.rs: get_master`, `list_masters(conn, &MasterQuery)` | Yes |
| Asset (photo) serving with ownership check | `net/mod.rs:199-236` | Yes, same pattern extends to any future ticket-embedded image |

## 4. What does **not** exist yet and has to be built per surface

### 4a. Masters (view) — smallest lift
Directly maps to `store::masters::list_masters`/`get_master`. Needs: a listing route per master
kind (or one route with a `?kind=` filter), a simple table render. No aggregation logic to port —
this is the same shape as the ticket list, just over masters instead of docs.

**Estimate: small.** Same size class as adding one more `route()` arm + one render function,
copying `render_ticket`'s structure.

### 4b. Tickets — list + detail/reprint — smallest lift
`/tickets` (list, filterable by date/party/material via query params, backed by `DocQuery`) plus
promoting the existing `/v/:doc_id` into a proper reprint page: add a "Print" button and a
`@media print` stylesheet pass that matches the real ticket slip layout closely enough to be useful
as a reprint, not just a web view of the same information.

**Estimate: small–medium.** The detail rendering exists; list view and print-fidelity CSS are new
but low-risk (pure presentation, no new business logic).

### 4c. Reports — the real unknown
**This is the one that needs care.** Dashboard + Reports together are **4,420 lines of TypeScript**
(`app/src/features/dashboard/`, `app/src/features/reports/`) — and that logic (groupings, date
range presets, saved-report definitions, summary totals, export formats) exists **only in
TypeScript today**. There is no Rust equivalent to call into, unlike Masters/Tickets which sit
directly on `store::` functions already shared with the desktop commands.

Getting numbers on the LAN portal to actually match what the desktop Reports screen shows requires
either:
- **(a) Re-implementing the aggregation logic in Rust**, reading the same `list_docs` rows and
  reproducing `reportRows.ts`'s grouping/summary math server-side — real, careful porting work,
  with the specific risk the codebase already flags for itself in PLAN.md §21's "On tests" note:
  silent arithmetic drift writes/*displays* permanently wrong numbers with no test net (Reports
  isn't in the 324-test pure-logic suite; the component/integration layer was explicitly left
  uncovered by standing decision). A ported-but-subtly-wrong summary is worse than not having one.
- **(b) A narrower, hand-picked subset** (e.g. just "today's totals," not full grouping/date-preset
  parity with the desktop Reports screen) — smaller and safer, but not what "Reports… all in
  read-only mode" literally asked for.

**Recommendation:** read `reportRows.ts` and `dashboardData.ts` in full before scoping this piece
further, and treat it as its own sub-task with its own review — do not fold it into the
Masters/Tickets work, whose risk profile is much lower. This file deliberately stops short of
picking (a) vs (b) — that's a decision for whoever scopes 4c next, once the actual aggregation
logic has been read.

### 4d. Weight/camera — placeholder only
A static "coming soon" section/page, wired up now so the nav doesn't 404, with no live data behind
it. Trivial once the nav shell (4e) exists. Full implementation is blocked on the real indicator/
camera work, tracked separately (PLAN.md §21, "Real camera capture" — deferred by decision).

### 4e. Navigation shell
The server currently has exactly one purpose (verification) and no navigation. Adding
Dashboard/Reports/Masters/Tickets means the `page_shell` needs a header/nav linking between them —
small, but touches every rendered page, so worth doing once, early, rather than retrofitting.

## 5. Open questions to settle before coding starts

1. **Does "QR verification page" stay the single on/off toggle for this whole portal**, or does it
   need renaming/splitting now that it's no longer just the QR page? (Settings → Connections →
   Integrations, `settingsSchema.ts:175`.) Cosmetic, but visible to every operator.
2. **Print fidelity bar for reprint/report print** — is "readable and correct" enough, or does it
   need to visually match the real thermal/A4 slip closely? Changes how much CSS work 4b/4c need.
3. **4c's (a) vs (b) decision** (re-implement full Reports aggregation in Rust vs. a narrower
   hand-picked summary) — needs the actual `reportRows.ts`/`dashboardData.ts` read-through first,
   not a decision made blind.

## 6. Suggested execution order, once approved

1. Nav shell + Masters (view) — lowest risk, proves the extended-routing pattern.
2. Tickets list + reprint (promotes the existing detail page).
3. Weight/camera placeholder (trivial, unblocks nothing else).
4. Dashboard + Reports — only after a dedicated read-through of `reportRows.ts`/`dashboardData.ts`
   and the 4c (a)/(b) decision above; treated as its own review, not bundled with 1–3.

No Cargo dependency changes anticipated for any of the above — everything reuses `tiny_http`,
`serde_json`, and the existing `store::` module.
