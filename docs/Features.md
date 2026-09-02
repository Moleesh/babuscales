# Feature inventory

What BabuScales actually does today, area by area — not what `PLAN.md` originally proposed. Every
row below was checked against the running code (`app/src/`, `app/src-tauri/src/`), not copied from
a spec. Where a feature is smaller than `PLAN.md` describes, that's said here directly; full
per-item narrative (what shipped, what was cut, and why) lives in
[`../app/README.md`](../app/README.md)'s "Where to start" list and its "Known gap" section — this
document is the map, that one is the detail.

**Status legend**

| | |
|---|---|
| ✅ **Real** | Built, persisted, and wired end to end — using it does the real thing |
| 🟡 **Partial** | Real, but smaller than the plan describes, or missing one real consumer |
| ⚪ **Decorative** | A control exists and can be toggled/clicked, but nothing runs behind it |
| — **Not built** | No code exists for this yet |

For the trimmed list of what's actually left to build, see [`../PLAN.md`](../PLAN.md) §21–23.

---

## 1. Weighing

| Feature | Status | Notes |
|---|---|---|
| Two-trip gross/tare, either order | ✅ | |
| One-trip against a stored tare | ✅ | |
| Strict tare / loose tare | ✅ | Loose tare warns when a stored tare is stale |
| Stability gate before capture | ✅ | Configurable readings-in-a-row + band (kg), Settings → Weighing |
| Many lorries at once — open-ticket strip, park & resume | ✅ | Saving one weight writes a real row and frees the deck |
| Recall on vehicle entry (resume / stored tare / fill-from-last-ticket) | 🟡 | Real, but a static inline banner, not the mock's positioned popover |
| Multi-gross (`[Tare, Gross1, Gross2…]`) | 🟡 | Off by default; net is a true per-load sum (`deriveWeights` in `db/ticketBody.ts`). Slip prints one aggregate line, not itemised per load; `save()` still only finishes and locks a ticket, so a multi-gross ticket's loads all need capturing in one continuous session |
| Explicit Tare/Gross capture-kind selector | ✅ | |
| Manual weight entry | — | Not built |
| Capture timeline component | 🟡 | The "Captured & calculated" card uses a 3-box grid, not a dedicated `CaptureTimeline` |
| Simulated indicator (no hardware needed) | ✅ | Tick physics ported from the reference mock |
| Real serial-port indicator | 🟡 | Works, but one general fallback parser + manual regex override, not true multi-brand auto-detection; never run against real hardware in this environment |

## 2. Masters

Parties · Materials · Vehicles · Vehicle types · Transporters · Places · Operators · Stored tares —
all eight kinds, one screen, inline create/edit.

| Feature | Status | Notes |
|---|---|---|
| Search | 🟡 | Client-side substring search over a cached list (`useMasterCache.ts`) — fine at site scale, not 100,000-row scale. `src-tauri/src/store/schema.sql` defines `doc_fts`/`master_fts` FTS5 virtual tables, but nothing in `src-tauri/src` or `src/` queries them yet — the tables exist, unused |
| Stored-tare staleness warning | ✅ | Fixed threshold, not a Setting |
| Material.Rate (drives Value) | ✅ | |
| Party Email / Phone (drives delivery) | ✅ | |
| Merge duplicates, bulk import/export | — | Not built |
| GST fields on Party | — | Not built |
| Vehicle ↔ Vehicle-type as a real link | — | Currently display text, not a foreign key |

## 3. Reports & Dashboard

| Feature | Status | Notes |
|---|---|---|
| Tickets / Summary views, one dataset | ✅ | |
| Four groupings, live totals | ✅ | |
| Bulk print (A4 / thermal / dot-matrix) | ✅ | |
| Excel export | ✅ | Hand-rolled, dependency-free `.xlsx` writer |
| CSV export | ✅ | RFC-4180, UTF-8 BOM for Tamil/₹ in Excel |
| PDF export | ⚪ | Button stays disabled — the OS print dialog's "Save as PDF" covers it |
| Saved report views | 🟡 | Named View/GroupBy/Filter presets, not a dynamic query builder over custom fields |
| Date-range filter | ✅ | `dateFrom`/`dateTo` wired end to end — `ReportsScreen.tsx` → `ReportsCardBody.tsx` → `useReportsScreenData.ts`'s `filterRowsByDateRange` |
| Dashboard KPIs, hourly chart, material split | ✅ | Real numbers, not simulated |
| Configurable dashboard hours | — | Fixed 06:00–20:00 window |

## 4. Printing

| Feature | Status | Notes |
|---|---|---|
| Three layout engines from one content model (A4 / thermal / dot-matrix text) | ✅ | |
| Print preview before committing | ✅ | |
| DUPLICATE stamping + print count | ✅ | |
| Charge on the printed slip | ✅ | |
| QR verification code on A4; URL as text on thermal | ✅ | |
| Default printer, one dropdown | ✅ | Replaces the old per-class A4/Mx/Th fixture list; preselects the OS's own default (`GetDefaultPrinterW`) until an operator picks something else — `window.print()` still opens the real OS dialog |
| Detected-printer list | ✅ | Real `EnumPrintersW` enumeration (Windows), folded into the Print preferences card |
| Print templates — managed list (upload/paste HTML, save/select/preview/edit/delete) | ✅ | Single-form add/edit, sandboxed pan/zoom preview; default and currently-selected templates can't be deleted |
| Windows RAW/ESC-P spooler path (`WritePrinter`, bypassing drivers) | — | `PLAN.md` §15.2's biggest technical risk; not implemented — all printing goes through the OS dialog today |
| Visual template designer (`{{Placeholders}}`, structured layout authoring) | — | Deferred by decision (Phase 8) — templates today are one HTML blob at a fixed page size |
| Starter templates (5–8 designs) | — | Not built |

## 5. Cameras & evidence

| Feature | Status | Notes |
|---|---|---|
| Camera tiles (Front / Rear / Plate / Driver) | 🟡 | The reference mock's own decorative fixture, faithfully ported — text over a placeholder, driven by live ticket state |
| Real USB / IP / RTSP / ONVIF capture | — | Not built — no `getUserMedia`, no frame ever actually captured |
| Overlay burn-in (ticket no, weight, time) | 🟡 | The *string* is computed correctly (`cameraBurnIn.ts`); nothing burns it into a real frame, since no real frame exists |
| ANPR | — | Deferred by decision (Phase 8) |

## 6. Trust, verification & audit

| Feature | Status | Notes |
|---|---|---|
| Hash chain on `audit` | ✅ | `doc` carries a plain content hash; `audit` (append-only) carries the chain |
| Public QR verification page | ✅ | LAN-only HTTP server by default; a printed A4 slip's QR resolves to it |
| Remote (public) verification | ✅ | Opt-in Cloudflare Tunnel — token to Windows Credential Manager, never the database |
| Anomaly detection | — | Deferred by decision (Phase 8) |

## 7. Settings

Six panes, admin-password-gated (except Appearance, which is deliberately open).

| Pane | What's real | What's not |
|---|---|---|
| **Fields & language** | Language-pack upload, live-applied, falls back to English per key. Field schema upload — relabels/reorders/indexes the 5 built-in fields, live-translated. `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen`/`Validate` formulas are evaluated (`schemaFieldValidation.ts`, `buildTicketFormulaContext.ts`) and generic Text/Number/Date/DateTime/Boolean/Select inputs render from schema (`SchemaFieldRow.tsx`) | Weighing's screen text and inner card copy still has some hardcoded-English gaps outside the schema-driven fields themselves |
| **Print** | Single default-printer dropdown (OS-default-aware), Copies/Show-dialog preferences, and a real managed print-template list (add/edit/select/preview/delete) | No visual template designer (Phase 8) |
| **Appearance** | 6 skins + 4 text sizes, applied globally and instantly, ungated by design. Operator-on-duty name | — |
| **Weighing** | Stability gate, Tare-first/Strict-tare/Auto-capture/Multi-gross rules, all live | — |
| **Connections** | Weight indicator (port/baud/pattern) · e-mail SMTP (real send + test) · SMS over serial GSM modem (real send + test) · Cloudflare Tunnel remote access · Integrations toggle list | `useOutboxWorker.ts` polls every 30s and drains `Pending`/backed-off-`Failed` rows for **Email, SMS, Webhook, Tally and Board** — no longer a "drain of one" for Email/SMS only. Cloud backup and accounting-format export beyond the Tally CSV line still have no consumer. **WhatsApp is permanently decorative** — no compliant free delivery path exists |
| **System** | Admin password, ticket numbering (prefix/width/reset), backup & restore (checksum-verified), legacy v1/v2 import, scheduled daily-summary e-mail, licence | Date/time display formats persist but aren't read elsewhere yet (money format is). Scheduled summary runs only while the app is open — no OS-level scheduler |

## 8. Hardware & connectivity

| Feature | Status | Notes |
|---|---|---|
| Serial weight indicator | 🟡 | See §1 above |
| Serial GSM modem SMS | ✅ | AT-command send; no cloud gateway, no per-message cost beyond the SIM |
| SMTP e-mail | ✅ | `lettre` over STARTTLS; password in Windows Credential Manager |
| Printer enumeration | ✅ | Win32 `EnumPrintersW` |
| Cloudflare Tunnel | ✅ | Token storage + supervised `cloudflared` process; app never calls the Cloudflare API |
| LED display, boom barrier, traffic light relays, presence sensor, TTS, RFID/barcode | — | Not built |
| Tailscale (private-mesh alternative) | — | Not built |

## 9. Licensing & release

| Feature | Status | Notes |
|---|---|---|
| Offline Ed25519 activation-code verification | ✅ | No server, no network call, machine-bound |
| 14-day free trial, gates new captures/Save on expiry | ✅ | Trial length is a placeholder pending real pricing |
| Windows installer (NSIS) | ✅ | Offline (~200MB, WebView2 baked in) and online (few MB, fetches WebView2 only if missing) variants |
| Vendor signing key | 🟡 | A throwaway dev keypair — must be replaced before any real licence ships |
| Android debug build (APK/AAB) | 🟡 | Builds and packages for real; not signed for Play Store, not run on a device |
| CI (typecheck/lint/build/secret-scan gates) | ✅ | Runs on push to `main`, verified green (`gh run view`) |
| GitHub Pages demo, CI on push | ✅ | Both workflows run on every push to `main` and pass |

## 10. Look, feel & accessibility

| Feature | Status | Notes |
|---|---|---|
| Six skins (Indicator/Graphite/Night shift/Paper/Daylight/High contrast) | ✅ | |
| Four-step text scale (A− … A++) | ✅ | |
| `Enter`-walks-like-`Tab`, `Space` fires | ✅ | |
| Contextual per-tab help drawer | ✅ | |
| Searchable Help manual / first-run guided setup | — | Not built — `features/help/` is empty |
| Languages (en / ta) | ✅ | Infrastructure is real (pack upload, per-field labels, fallback-to-English), and a real hand-translated Tamil pack (`app/src/i18n/packs/ta.ts`, ~290 keys) ships as source, covering navigation, weighing, reports, dashboard, cameras, masters, components and most of settings. Settings still has some inner card-body text not yet routed through translation |

## 11. Backup, import & data portability

| Feature | Status | Notes |
|---|---|---|
| Manual backup, checksum-verified | ✅ | `VACUUM INTO` + SHA-256 |
| Restore, admin-gated with confirm | ✅ | Replaces all data — no partial/merge restore |
| Scheduled backup, retention (keep N daily/weekly/monthly) | — | Not built — manual only |
| Remote backup targets (USB/network share/cloud) | — | Not built — local file download/upload only |
| Legacy v1/v2 import | 🟡 | Reads a documented JSON bundle, idempotent and previewed; not a native `.mdb`/`.db` reader |
| Expression-index manager (`PLAN.md` §6.3) | — | Not built — `engines/indexEngine` is an empty stub |

---

## Deferred by decision — not gaps, choices

| Feature | Why |
|---|---|
| ANPR | Designed for, not built — `PLAN.md` Phase 8 |
| Visual template designer | Designed for, not built — Phase 8 |
| Anomaly detection | Designed for, not built — Phase 8 |
| WhatsApp delivery | No compliant free path exists (Meta's paid Cloud API, or ToS-violating unofficial libraries) — will stay decorative permanently, not queued |

## Blocked externally

| Feature | Blocked on |
|---|---|
| MiMaS (Tamil Nadu e-permit integration) | An integration spec that doesn't exist yet |

## Paused

| Feature | Status |
|---|---|
| Unit test suite | 167 tests across 25 `*.spec.ts(x)` files, verified live this session (`npx vitest run`). Covers `src/components/` (design-system library), `src/constants/`, `src/engines/` (formula, schema, and more), plus some `src/db/`, `src/i18n/` and `src/features/reports` / `src/features/weighing` coverage. Most of `src/features/` (the screens themselves) is still uncovered, paused by request mid-pass |
