# BabuScales — Technical Plan (v3.0)

> Weighbridge management software, designed from first principles.
> **Status (2026-08-11):** Phases 0–7 are built and running against a real SQLite database — not
> planning anymore. What's actually left is §21's "What's left" list — ordered by effort, smallest
> first — plus the Phase 8/9 work this plan always deferred by decision. §23's open questions are
> set aside deliberately: decisions, not engineering effort. For the full current-state feature-by-feature
> breakdown, see [`docs/Features.md`](docs/Features.md); for the task-by-task build log, see
> [`app/README.md`](app/README.md). **Owner:** Moleesh / Babulens.

---

## 1. Name and terminology

**BabuScales** — `Babu` + `Scale`. *"Truck scale"* is the standard international term for a
weighbridge, so the name reads correctly in India and abroad, and carries a second meaning:
the system scales across sites.

Terminology is inherited from the weighbridge trade, corrected where the old naming was unclear.
**These names are used everywhere — code, database, UI, templates, documentation.**

| BabuScales term | Old term | Why |
|---|---|---|
| **Ticket** | Weighing / SLNO row | The whole transaction. "Weighing" was used for both the record and the act |
| **Capture** | Gross Wt / Tare Wt | A single weight reading with its own time, operator and photos |
| **Gross / Tare / Net** | GROSSWT / TAREWT / NETWT | `Net`, not `Nett` — the old spelling was inconsistent |
| **Ticket No** | Sl.No / SLNO | "Serial number" collided with hardware serial ports |
| **Party** | Customer's Name | Covers buyer, seller and hirer without implying direction |
| **Transporter** | Driver Name / Transporter | Kept |
| **Challan No** | DC No | Delivery Challan, spelled out |
| **Charge** | Charges / Final Amount | Money charged for weighing |
| **Stored Tare** | Vehicle Tares | Kept, clarified |
| **Operator** | Operator Tare / Gross | Recorded per capture |
| **Format** | Print Option / Report | One word for "which design" |
| **Template** | html file | The print design |
| **Schema** | — | The field definition |
| **Master** | Materials / Customer / Transporter tables | Reference data, one concept |

---

## 2. Design principles

1. **Configuration over code.** Onboarding a customer never requires a release.
2. **Fixed tables, zero migrations.** The schema is created once and never altered (§6).
3. **Everything lives in the database.** No loose files on disk — not images, logos, fonts,
   templates or settings (§6.4).
4. **Separate what, where and how.** Schema / Layout / Template are independent artifacts.
5. **Reusable by default.** Every visual element is a shared component. Nothing is built twice (§10).
6. **Nothing is ever lost.** Power cuts, dead cameras, offline portals — none may cost a ticket.
7. **Offline is normal.** Internet is an accelerant, never a dependency.
8. **Show, don't explain.** Minimal on-screen prose; depth lives behind a help control (§11).
9. **Trust must be provable.** Hash-chained audit, photographic evidence, verifiable tickets.

---

## 3. Decisions locked

| Area | Decision |
|---|---|
| Name | **BabuScales** |
| Stack | **Tauri v2 + Rust + React 19 + TypeScript + SQLite** |
| Schema | **Fixed tables, never altered.** All variability in JSON (§6) |
| Indexes | **Expression indexes** — user-definable, no table change (§6.3) |
| Storage | **All content in the database as blobs.** No local files (§6.4) |
| Fields | Dynamic, typed, with **formula fields** and **search fields** (§8) |
| Printers | Dot matrix (ESC/P) · A4/A5 (PDF) · Thermal (ESC-POS) — one template, three targets |
| Captures | **Array of captures**, not fixed gross/tare columns — enables multi-gross with no change (§7) |
| Status | **No state machine.** A ticket's status is its tare, gross and net (§7.4) |
| Concurrency | **Many tickets open at once.** One weight saves and frees the deck (§7.5) |
| Tare modes | **Strict** and **Loose**, plus first-capture toggle (§7.2) |
| Navigation | Six tabs: Dashboard · Weighing · Cameras · Reports · Masters · Settings. **No Tickets tab** — a ticket list is an ungrouped report (§13.1) |
| Protection | **Single admin password**, entered as a **session unlock** from the top bar (§12) |
| Keyboard | **`Enter` walks fields and buttons like `Tab`**; `Space` presses (§13) |
| Localisation | Language packs as JSON rows; **field labels ride in the field definition** (§8.3) |
| Templates | Authored in a **three-step wizard** — layout, paper, output — and managed as a list (§15.1) |
| On-screen prose | **None**, except a one-line note per weighing rule (§11) |
| Components | Everything reusable — buttons, sidebar, dialogs, fields (§10) |
| Help | **Contextual help control**, fully translated (§11) |
| Languages | `en` · `ta` (தமிழ்) |
| Remote | **Cloudflare Tunnel**, opt-in, credentials in OS keychain. No ngrok |
| Backup | Scheduled + manual, verified, restorable (§14) |
| MiMaS | Seam now, implementation later |
| Mobile | Responsive now; **APK is the end goal** |
| Demo | The real app running with **no database** |
| Tests | **Last phase**, by decision |

---

## 4. Complete feature inventory

Extracted from v1 and v2 in full, so nothing is lost. Every item maps to a home in this plan.

### 4.1 Weighing
Two-trip gross/tare · one-trip with stored tare · **strict tare** (re-weigh every time) ·
**loose tare** (reuse stored) · first-capture toggle · tare token print · tare without consuming a
ticket number · manual weight entry (flagged) · estimated weight · final weight · reweigh ·
edit-enable with password · cancellation with reason · **multi-gross (future)** ·
**many tickets open at once** (§7.5) · **explicit Tare / Gross selector** — the rule sets the
default, the operator can always override it · **previous-value recall on vehicle entry** (§9.2).

### 4.2 Ticket fields
Ticket No · Challan No + date · Party · Transporter · Operator (per capture) · Vehicle No ·
Vehicle Type · Place · Phone · Material · Material serial · Charge · Credit flag · Gross/Tare/Net
with **separate date and time each** · Final weight · Final amount · Remarks · **Custom 1–4** ·
Manual flag · Bag weight · Number of bags · Round-off with configurable decimals ·
Ice-water/freight deduction.

### 4.3 Masters
Materials (with **cost** and **bag weight**) · Parties · Transporters · Places · Vehicle types
(with **tare charge** and **gross charge**) · Operators · Stored tares (with party, place, phone,
captured date/time) · **searchable, no lag** (§9).

### 4.4 Charging
Auto-charge from material cost · per-vehicle-type charge differing for tare and gross ·
default charge · round-off · credit accounts · final amount · exclude-charge toggle.

### 4.5 Printing
Weight ticket · tare token · exit pass · invoice · quotation · reports · **mass print** ·
re-print · copies with dialog · pre-printed stationery · header lines (3 titles + footer) ·
free-text lines 1–4 · government/contract block (work name, contractor, department, site,
agreement no, estimate no) · per-field exclude toggles · **local vs other-state variants**.

**The six formats that must actually work** — taken from v2, and the specification for whether the
block model is sufficient: `Pre Print 1` · `Pre Print 2` · `Plain Paper` · `WebCam Print` ·
`Municipal Print` (the government block above) for tickets; `Pre Print 1` · `Pre Print 2` ·
`Standard` for invoices. **`Pre Print 1` is the hardest** — three carbon columns of identical
content on one 8″×6.1″ form, 223px apart, where the *printer* produces the copies in hardware.
Model it before finalising the block set (Phase 0).

### 4.6 Invoicing
Schema-driven invoice fields · invoice numbering with reset · QR from a format string ·
invoice reports · invoice print formats.

**GST detail**, which "interstate/local variants" was hiding: GSTIN with checksum validation ·
HSN/SAC · unit price · quantity · amount · mode of payment · time of arrival · reference ticket
no · and **six tax fields** — CGST/SGST/IGST *rates* and CGST/SGST/IGST *amounts*, where place of
supply decides CGST+SGST versus IGST. **Amount in words** with Indian lakh/crore numbering and
`en-IN` currency formatting.

**Dummy invoices** — a *second, parallel* numbering series for proforma/non-GST documents, with
its own next-number and duplicate check, independent of the main series.

### 4.7 Cameras
Up to 4 (now **8**) · enable per camera · name · resolution · **crop rectangle per camera** ·
capture on weighment · print camera images on ticket.

### 4.8 Hardware
**N named serial devices, not one.** v2 configures two independently — `indicator` (read, with a
message listener) and `display` (write-only, pushing weight to a remote LED board) — each with its
own settings. Model it as a list from day one.

Per device: baud · data bits · stop bits · parity · **flow control** · **delimiter byte** (message
terminator, default `10`) · **last-character token** (drives frame splitting) · message pattern.
Flow control and the delimiter are separately load-bearing — some indicators need RTS/DTR
asserted, and the delimiter drives framing. All belong in the setup wizard.

Also: **SMS via serial GSM modem** · printer selection with **cached enumeration** (v2 cached it
because enumerating Windows printers is slow) and a manual refresh · a **simulated indicator** and
a **simulated camera** so the demo, training and §16's "a dead camera never blocks a ticket" are
all actually exercisable.

### 4.9 Reports and data
Weighing report · invoice report · filter by date/party/vehicle/material/transporter/ticket range ·
**export to Excel** · **import from Excel** · totals · row insert/delete · column exclusion.

### 4.10 System
Login toggle · **ten separate action passwords** (consolidated — §12) · licence with trial and
expiry · UID machine binding · backup toggle · settings page 2 · status bar · **built-in
calculator** with memory · unlock · reset ticket no / invoice no / tares.

### 4.11 Site profiles (v1 "settings" specialisations)
Kotta setting · Godown setting · Estimated-weight setting · Ice-water setting.
**These become named configuration presets, not code branches.**

---

## 5. Stack

**Tauri v2 + Rust core + React 19 + TypeScript + SQLite.**

| | Tauri v2 | JVM | Electron |
|---|---|---|---|
| Idle RAM | **~60–90MB** | ~250–400MB | ~350–500MB |
| Installer | **~10MB MSI**¹ | ~80MB | ~150MB |
| Cold start | **<0.5s** | 1.5–4s | 1–2s |
| Native APK, same code | **✅** | ❌ | ❌ |

Chosen on a **4GB RAM** target, performance, current technology, zero licence cost and the Android
end-goal. Rust is confined to hardware, storage and transport — **target <15% of the codebase**.
All domain logic is TypeScript so it runs identically on desktop, LAN, browser demo and Android.

¹ Tauri's own baseline, with a WebView2 install mode that fetches the runtime over the internet at
install time. Task #39 measured the real, shipped MSI/NSIS at **~204MB** each — `webviewInstallMode:
offlineInstaller` (§20.1) bakes the entire WebView2 Evergreen Runtime into the installer itself so a
quarry with no internet connection can still install cleanly, which was always the actual
requirement. That tradeoff is deliberate and stands; a USB stick or LAN copy handles ~200MB without
issue, and it's still an order of magnitude smaller than Electron's idle RAM footprint alone.

### 5.1 The decision was challenged and stands

An adversarial review argued for Electron + Capacitor instead, on evidence worth recording:
VaultBill already ships an Android APK via Capacitor; it holds ~5,810 lines of working desktop
integration (printing, PDF, printer enumeration, backup, credentials, LAN server with auth) that
Tauri means rewriting in Rust; Tauri has **no print plugin**; and the measured RAM gap is
~150–250MB, less than the earlier claim.

**Decision: Tauri stands.** Smallest installer, lowest memory on the 4GB target, and one codebase
that reaches Android natively rather than through a second toolchain.

**What that obliges us to own** — accepted deliberately, not waved away:

| Obligation | Where it is solved |
|---|---|
| Windows print path — Tauri has no plugin | §15.2, specified concretely |
| Printer enumeration, backup, credentials, LAN auth in Rust | Phases 1–4, no reuse from VaultBill |
| Two desktop stacks maintained alongside VaultBill | Accepted cost |

The engines (`src/engines/`) are framework-agnostic TypeScript, so they port from VaultBill
**either way** — roughly 4,500 lines of formula, schema, print-composition, import and report
logic. Only the Rust I/O layer is genuinely new work. Extracting those engines into a shared
`@babulens/engines` package remains the highest-leverage refactor available.

---

## 6. Data platform — fixed tables, zero migrations

v1's `update.sql` is a hundred `ALTER TABLE ... ADD COLUMN` statements. **BabuScales will never
alter a table.** The tables below are created once, at first run, and never change again.

### 6.1 The complete, final schema

```sql
-- ORDER MATTERS. page_size is immutable once WAL is enabled; changing it later
-- requires journal_mode=DELETE + VACUUM + re-enter WAL, which is a migration.
PRAGMA page_size    = 8192;   -- MUST be first. 8K suits a JSON + image store
PRAGMA journal_mode = WAL;
PRAGMA synchronous  = FULL;   -- WAL defaults to NORMAL, which does NOT fsync on
                              -- commit. §6.5's durability claim is false without this
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;   -- LAN clients contend with background backup

-- Every business record: tickets, invoices. Nothing else is ever added.
CREATE TABLE doc (
  doc_id       TEXT PRIMARY KEY,                       -- ULID: sortable, offline-safe
  doc_kind     TEXT NOT NULL,                          -- 'Ticket' | 'Invoice'
  profile_id   TEXT NOT NULL DEFAULT 'default',        -- multi-profile base, UI hidden
  series_epoch INTEGER NOT NULL DEFAULT 0,             -- bumped by a numbering reset
  doc_seq      INTEGER,                                -- human-facing number, NULL until issued
  is_cancelled INTEGER NOT NULL DEFAULT 0,              -- a flag, not a status — §7.4
  body         TEXT NOT NULL CHECK (json_valid(body)), -- all fields, all captures
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  body_hash    TEXT NOT NULL                           -- hash of CURRENT body, not a chain
);

-- Ticket numbers must be unique per profile per numbering epoch. Without this,
-- two operators (cabin PC + phone on the LAN) can be issued the same number.
-- Numbers are allocated inside BEGIN IMMEDIATE, at close, never at draft.
CREATE UNIQUE INDEX ux_doc_seq
  ON doc (doc_kind, profile_id, series_epoch, doc_seq)
  WHERE doc_seq IS NOT NULL;

-- All reference data: parties, materials, vehicles, transporters, places, tares, operators.
CREATE TABLE master (
  master_id   TEXT PRIMARY KEY,
  master_kind TEXT NOT NULL,
  name        TEXT NOT NULL COLLATE NOCASE,
  body        TEXT NOT NULL CHECK (json_valid(body)),
  is_active   INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL,
  UNIQUE (master_kind, name)
);

-- All configuration: schemas, layouts, templates, settings, formats, presets, indexes.
CREATE TABLE config (
  config_id   TEXT PRIMARY KEY,
  config_kind TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (json_valid(body)),
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL
);

-- ALL binary content: camera images, logos, fonts, template assets, signatures.
-- Named `asset`, not `blob` — BLOB is a type name and reads ambiguously in every query.
CREATE TABLE asset (
  asset_id    TEXT PRIMARY KEY,
  asset_kind  TEXT NOT NULL,
  owner_id    TEXT,                                   -- doc_id / config_id. Polymorphic,
                                                      -- so NOT FK-enforceable — needs a reaper
  mime_type   TEXT NOT NULL,
  bytes       BLOB NOT NULL,
  size_bytes  INTEGER NOT NULL,
  sha256      TEXT NOT NULL,
  meta        TEXT NOT NULL CHECK (json_valid(meta)), -- camera, stage, crop, ANPR result
  created_at  TEXT NOT NULL
);
-- NEVER `SELECT *` from asset: SQLite materialises the whole row, so selecting
-- metadata would load every image. Enforced by lint.

CREATE TABLE audit  ( audit_id TEXT PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL,
                      action TEXT NOT NULL, target TEXT, body TEXT NOT NULL, row_hash TEXT NOT NULL,
                      prev_hash TEXT );
CREATE TABLE outbox ( outbox_id TEXT PRIMARY KEY, channel TEXT NOT NULL, body TEXT NOT NULL,
                      attempts INTEGER NOT NULL DEFAULT 0, next_try_at TEXT, state TEXT NOT NULL );
CREATE TABLE journal( journal_id TEXT PRIMARY KEY, at TEXT NOT NULL, applied INTEGER NOT NULL
                      DEFAULT 0, body TEXT NOT NULL );

-- contentless: without content='', FTS5 stores a SECOND full copy of all indexed
-- text, roughly doubling text storage for no benefit.
CREATE VIRTUAL TABLE doc_fts    USING fts5(text, content='', tokenize='unicode61');
CREATE VIRTUAL TABLE master_fts USING fts5(text, content='', tokenize='unicode61');
```

**Honest accounting:** that is 8 declared tables, but each FTS5 virtual table creates ~4 shadow
tables, so the real object count is ~16. The claim is about *stability*, not count.

**And a correction to the principle itself.** "Zero migrations" as originally stated was
overclaiming, and VaultBill disproves it — `DatabaseStartup.ts` calls `patchMissingColumns()`
backed by `RequiredColumnBuilders.ts`, under the same JSON-first design. The honest, achievable
rule is the one that project already proved:

> **Additive-only, idempotent, startup-applied schema patches. No numbered migration chain, no
> destructive DDL, ever.**

That still eliminates v1's `update.sql` pain — which came from *ordered, stateful* migrations —
while remaining true.

**The JSON body is also a schema.** Deferring change into `body` does not eliminate it; it makes it
invisible. So every body carries a version and an upcaster chain applied lazily on read:

```jsonc
{ "BodyVersion": 3, "TicketNo": 1042, ... }
```

Without this, renaming a key (§1 renames `Nett` → `Net`) silently breaks every historical record.

### 6.2 Why this scales

Growth is JSON and images, and both are handled without schema change: JSON grows inside `body`,
images grow inside `blob`. Row counts grow; column counts never do. `doc` stays narrow and fast
because the heavy content is in `blob`, joined only when needed.

### 6.3 Custom indexes without altering tables

**Expression indexes** — not generated columns, because those require `ALTER TABLE`:

```sql
CREATE INDEX ix_ticket_vehicle
  ON doc (json_extract(body, '$.VehicleNo'))
  WHERE doc_kind = 'Ticket';
```

Creating or dropping one changes no table and touches no row. The **Index Manager** lets the
admin index any field, shows size and usage, suggests indexes by watching slow queries, and drops
unused ones. Definitions live in `config` as `config_kind = 'Index'`, so they travel with backups.

### 6.4 Everything in the database

No loose files. Images, logos, fonts, template assets and signatures are rows in `asset`.

| Benefit | Detail |
|---|---|
| Backup is one file | Nothing to forget, nothing to lose |
| Move sites | Copy one file, everything comes |
| Integrity | Every blob carries a SHA-256, chained into audit |
| No path bugs | No drive letters, no permissions, no missing folders |
| Speed | SQLite outperforms the filesystem for blobs under ~100KB |

**Scaling media — corrected.** An earlier draft proposed an `ATTACH`-ed `media.db`. **That was
wrong and is withdrawn.** SQLite guarantees atomicity *per database*, **not across attached
databases in WAL mode** — so a capture writing a ticket to one file and its photographs to another
can half-commit on a power cut, which is precisely the failure principle 6 exists to prevent. It
also silently turns "one file to back up" into six (`.db`, `-wal`, `-shm` × 2) with no
cross-file consistent snapshot.

**One database file.** Media is controlled by size, not by splitting:

- Downscale to 1280×720, JPEG q75 on capture → ~120–180KB per image.
- 2 cameras × 2 captures × 100 tickets/day ≈ 50MB/month, ~600MB/year.
- A 5-year ~3GB single file is comfortable for SQLite and `VACUUM INTO` backs it up in minutes.
- If a high-volume site outgrows it, the escape hatch is **archival, not a live second database**:
  `VACUUM INTO assets_2026.db`, detach, prune the live file. That keeps the hot file small
  without ever putting a non-atomic cross-database write in the capture path.

Note also that the "SQLite is 35% faster than the filesystem" benchmark measures **10KB** blobs and
explicitly states the filesystem wins as blobs grow, with the crossover between 250KB and 1MB.
Camera JPEGs sit near that crossover, so **speed is not the reason to store them in the database**
— transactional integrity and single-artifact portability are. That is the honest argument.

Incremental blob I/O is **not** used: it cannot resize a blob, fails on indexed and foreign-key
columns, and buys nothing at JPEG sizes. Bound parameters are simpler and correct.

### 6.5 Durability

Writes are **journal-first**: append to `journal` and fsync → apply → mark applied. On restart,
unapplied entries replay. A power cut costs the keystroke in flight, never a captured weight.

### 6.6 Numbers

Weights are **integers in kilograms**. Money and rates are **decimal strings** with BigInt-backed
arithmetic — never JavaScript floats. Rounding mode is explicit and configured per site.

---

## 7. Ticket and capture model

### 7.1 Captures are an array

The single most important modelling decision. A ticket does not have `gross` and `tare` columns —
it has an ordered list of captures:

```jsonc
{
  "TicketNo": 1042,
  "VehicleNo": "TN74AB1234",
  "Party": "Sri Lakshmi Traders",
  "Material": "M-Sand",
  "Captures": [
    { "CaptureId": "01J...", "Type": "Tare",  "WeightKg": 12340, "At": "2026-08-08T09:14:22+05:30",
      "Operator": "Ravi",  "Source": "Indicator", "Images": ["asset:01J..."] },
    { "CaptureId": "01J...", "Type": "Gross", "WeightKg": 31120, "At": "2026-08-08T11:02:05+05:30",
      "Operator": "Kumar", "Source": "Indicator", "Images": ["asset:01J..."] }
  ],
  "NetKg": 18780
}
```

This gives, with **no schema change ever**:

| Flow | Captures |
|---|---|
| Two-trip | `[Tare, Gross]` or `[Gross, Tare]` |
| One-trip, stored tare | `[Gross]` + stored tare reference |
| **Multi-gross (future)** | `[Tare, Gross1, Gross2, Gross3…]` — net computed per gross |
| Re-weigh | Extra capture, superseding, both retained |

Every capture carries **its own date, time, operator, source and photographs** — which is what
makes the timeline display in §7.3 possible and audit meaningful.

### 7.2 Tare modes

| Mode | Behaviour |
|---|---|
| **Strict tare** | The tare must be weighed on the bridge every time. Stored tares are never reused. For sites where accuracy is contractual |
| **Loose tare** | A stored tare may be reused repeatedly, subject to a validity window. Shows age and source, warns when stale |
| **First capture** | Toggle: gross first, or tare first |
| **Tare token** | Print a token on the first capture |
| **Tare numbering** | Whether the first capture consumes a ticket number |

### 7.3 Date and time, made clear

The old system stored gross and tare dates and times in separate columns and displayed them
inconsistently. BabuScales shows a **capture timeline**:

```
  Tare    12,340 kg    Fri 08 Aug 2026   09:14 AM   Ravi    📷 2
    │
    │  1 h 47 m on site
    ▼
  Gross   31,120 kg    Fri 08 Aug 2026   11:02 AM   Kumar   📷 2
  ─────────────────────────────────────────────────────────────
  Net     18,780 kg
```

Absolute date **and** day-of-week, 12-hour time with AM/PM, elapsed time between captures, and the
operator on each. Formats are configurable; the timeline is not.

### 7.4 Status — there is only one, and it is the weights

**Locked in the demo, round 3.** An earlier draft had a five-state machine —
`Draft → Open → Closed`, plus `Void`. It was removed. A named state is a second thing to keep in
sync with the captures, and it can disagree with them.

**A ticket's status is the pair of weights and the net they produce.** Nothing to memorise, nothing
to look up, nothing that can drift from the data:

```
TARE    —        GROSS    —        NET    —          nothing captured yet
TARE  12,340     GROSS    —        NET    —          weighed in, waiting for the second weight
TARE  12,340     GROSS  31,120     NET  18,780       complete
```

- **Net carries the accent.** It is the number the site is paid on, so it is the only segment that
  changes colour, and only once both weights exist.
- Rendered by one component everywhere it appears — ticket header, every table row, help.
- Numerals are fixed-width and right-aligned (`tabular-nums`, `min-width` in `ch`) so tare, gross
  and net line up down a column even though the labels differ in width.
- There is therefore **no separate Net column** in any table. It would be the same number twice.

**Cancellation is a flag, not a status.** The row stays, struck through, with the reason on the
audit trail. Nothing is ever deleted.

**Printing is not a status either.** A ticket carries a print *count*; every copy after the first
is stamped `DUPLICATE` and recorded. See §15.

### 7.5 Many lorries in flight — the deck is not a queue

**Locked in the demo, round 4.** The single most important correction to come out of the mock.

An earlier model held one ticket on the Weighing screen at a time, which meant the next lorry could
not be weighed until the previous one came back for its second weight. On a real site the gap
between tare and gross is hours. That model would have made the software unusable.

**Save with one weight writes the row and frees the deck immediately.**

| Action | Effect |
|---|---|
| Capture first weight, then **Save** | Row is written with one weight. Deck is freed, ticket number advances, the operator carries straight on with the next lorry |
| **Open-ticket strip** | Every ticket awaiting a second weight, shown as chips across the top of the Weighing screen — vehicle, weight, which weight it is, and the time |
| Click a chip, or **Resume** from a Reports row | Loads that ticket back, restores its fields, locks the captured weight and pre-selects the missing one |
| Capture second weight, then **Save** | Ticket completes. Fields lock, printing unlocks |

A one-weight ticket is a **real, saved row** — not a draft in memory. That is what makes the deck
free. It also means an interrupted shift, a power cut or a closed lid loses nothing.

---

## 8. Field engine

Fields are **typed definitions**, stored in `config`. Modelled on VaultBill's schema engine.

```ts
type FieldKind =
    | 'Text' | 'Number' | 'Weight' | 'Money' | 'Date' | 'DateTime' | 'Boolean'
    | 'Search'    // searches master data — §9
    | 'Select'    // fixed options
    | 'Formula'   // computed — §8.1
    | 'Sequence'  // numbered series with reset policy
    | 'Media'     // camera capture
    | 'Note';

interface FieldBase {
    FieldId: string;
    Label: Localized;               // en / ta
    Help?: Localized;               // shown by the help control — §11
    Indexed?: boolean;              // → expression index, §6.3
    RecallFrom?: RecallRule;        // prefill from history, §9.2
    VisibleWhen?: Formula;
    RequiredWhen?: Formula;
    ReadOnlyWhen?: Formula;
    Validate?: Rule[];              // severity: Block | Warn | Note
    Protected?: boolean;            // requires admin password to change, §12
}
```

**Validation has severity.** `Block` refuses, `Warn` allows with a recorded reason, `Note` advises.
Software that can only refuse gets bypassed, and bypassed software records nothing.

### 8.1 Formula fields

A small, safe, sandboxed expression language — no `eval`, no IO, no loops, hard time bound.
Decimal arithmetic is BigInt-backed, matching VaultBill's `FormulaNotes` policy.

```
Net          = abs(Gross - Tare)
Charge       = Rate(Material) * Ceil(Net / 1000)
FinalWeight  = Net - (Bags * BagWeight(Material))
Charge       = If(Credit, 0, VehicleCharge(VehicleType, CaptureType))
Overload     = Net > Capacity(VehicleType) * 1.05
ShowPermit   = Category(Material) == "Mineral"
```

The editor offers autocomplete over the schema, live evaluation against a real record, and a
plain-language explanation — so a site can be configured by someone who is not a programmer.
This replaces v1's hardcoded auto-charge, bag weight, round-off and ice-water logic entirely.

### 8.2 Search fields

A field that searches master data as you type. Ranked by **recent and frequent**, not
alphabetical; fuzzy; alias-aware so *"SRI LAKSHMI"* and *"Sri Laxmi"* resolve to one party; and
able to create a new master entry inline without leaving the field. Backed by FTS5 (§9).

---

### 8.3 Localisation — labels travel with the field

**Locked in the demo, round 4**, answering a question that would otherwise have bitten us on the
first custom field: *if a site adds a field, where does its translation come from?*

Translation lives in **two places, deliberately**, and the split is what makes new fields work:

**1 · UI strings — a language pack, uploaded as JSON, stored as a row.**

```json
{ "Code": "ta", "Name": "தமிழ்", "Version": 7,
  "Strings": { "nav.weigh": "நிறுத்தல்", "tare": "காலி எடை", "gross": "மொத்த எடை" } }
```

- English is snapshotted from the markup at boot and is always the fallback, so a pack carries only
  what it overrides. A half-translated pack still runs — untranslated keys simply stay English.
- Packs are versioned, listed in Settings, and replaced by dropping a new file. No release needed.
- One extra language ships at a time. Tamil first.

**2 · Field labels — inside the field definition, not the pack.**

```json
{ "Key": "VehicleNo", "Label": { "en": "Vehicle No", "ta": "வாகன எண்" },
  "Type": "Master", "Master": "Vehicle", "Required": true, "Upper": true, "Index": true }
```

A field added tomorrow **brings its own labels with it**, in the same file, and no language pack has
to be reissued to keep up. This is the whole reason for the split: the schema is site-specific and
changes often; the language pack is product-wide and changes rarely. Binding them together would
mean every site's custom field forcing a new translation release.

Field **help text** follows the same rule and rides in the definition alongside `Label`.

The printed ticket keeps its **own** language setting, independent of the screen — a dot-matrix
printer has no Tamil font, only codepages (§15.3).

---

## 9. Masters and recall — with no lag

### 9.1 The Masters browser

One screen for everything saved: **Parties · Materials · Vehicles · Vehicle Types · Transporters ·
Places · Operators · Stored Tares**. Each with instant search, inline edit, merge duplicates,
activate/deactivate, usage count, last-used date, and bulk import/export.

**No lag, by construction:**

| Technique | Effect |
|---|---|
| FTS5 search in SQLite | Filtering happens in the database, never in JavaScript |
| Row virtualisation | Only visible rows render — 100,000 rows scroll like 20 |
| Keyset pagination | No `OFFSET`; page 900 is as fast as page 1 |
| Expression indexes | Every filterable column indexed on demand |
| Debounced queries | Keystrokes coalesce; in-flight queries cancel |
| Prepared statements | Reused, never rebuilt |

Stored Tares get their own view — vehicle, weight, **captured date and time**, age, party, and a
staleness warning.

### 9.2 Recall — the system says what it already knows

**Locked in the demo, round 4.** Recall is not silent prefill. Entering a vehicle number opens a
popover offering what the database already holds about that lorry, each item a separate choice the
operator accepts or ignores:

| Offer | Shown when | Effect |
|---|---|---|
| **Resume TKT-1038** · tare 11,890 kg · 11:58 | That vehicle has a ticket awaiting its second weight | Loads the parked ticket (§7.5) |
| **Use stored tare 16,200 kg** · taken 05 Aug · in 22 days | A stored tare exists, is **not expired**, no tare captured yet, and **strict tare is off** | Adds it as a capture, stamped `stored tare` rather than a deck reading |
| **Fill from TKT-1035** · Ponvandu Ready Mix · Blue Metal 12mm | Any previous ticket for that vehicle | Fills party, material and transporter, each tagged `RECALLED` with a dashed border |

Nothing is applied without the operator picking it. Vehicle type fills automatically from the
vehicle master, because it is a property of the lorry and not a judgement.

Open tickets are additionally always visible as the strip on the Weighing screen (§7.5).
Duplicate tickets are surfaced before saving. Full history search sits in Reports (§13.1).

---

## 10. Component architecture

**Everything reusable.** Following VaultBill's proven layout: no feature builds its own button,
its own dialog, or its own table.

```
src/
├─ components/                    reusable, feature-agnostic — the design system
│  ├─ AppShell/                   AppShell · Sidebar · Topbar · MobileNav · ContentFrame
│  ├─ Button/                     Button · IconButton · ActionButton · ActionBar
│  ├─ AppModal/  AppDrawer/  AppSheet/  AppPopover/  AppConfirmDialog/
│  ├─ Field/                      TextField · NumberField · WeightField · MoneyField
│  │                              DateField · DateTimeField · SearchField · FormulaField
│  ├─ DataTable/                  virtualised table · column chooser · totals
│  ├─ SearchableDropdown/
│  ├─ ContextualHelp/             the help control — §11
│  ├─ WeightDisplay/              the virtual indicator — §13
│  ├─ CaptureTimeline/            §7.3
│  ├─ CameraTile/  StatusPill/  FeedbackStates/  EmptyState/
│  └─ ThemePalette/
├─ engines/                       pure logic, no UI, no IO
│  ├─ schemaEngine/  formulaEngine/  printEngine/  reportEngine/
│  ├─ importEngine/  permissionEngine/  indexEngine/  trustEngine/
├─ features/                      screens, composed from components + engines
│  ├─ weighing/  masters/  tickets/  invoices/  reports/
│  ├─ designer/  cameras/  settings/  backup/  help/
├─ db/
│  ├─ DataPort.ts                 the one contract
│  └─ adapters/                   tauri · memory · http
├─ i18n/                          en · ta
└─ constants/
```

**Rules:**
- A component in `features/` may not define a styled primitive. If it needs one, it belongs in
  `components/`.
- `engines/` are pure — no React, no IO, no Tauri. This is what makes them testable later.
- Folder-per-component with an `index.ts` barrel, matching your existing projects.
- Internals go in `_private/`, matching HireWise.
- Files over 300 lines split into a `*Support.ts` companion, matching VaultBill.

The Rust side mirrors it: `src-tauri/src/{commands,store,devices,print,outbox,net,security}/`.

---

## 11. Help, not prose

Screens carry **no explanatory prose at all**. **Locked in the demo, round 4:** every one-line
description under a control was removed, because a `?` in the top bar opens help for the tab you
are standing on. Explaining the same thing in two places means maintaining it in two places and
translating it twice.

**The single exception is the weighing rules.** Each rule keeps a one-line note under it, because a
rule silently changes what the operator is allowed to do, and the consequence has to be legible at
the moment of the decision — not one click away.

Live feedback is not prose and stays: the status line under the capture button, the stability
lamps, the capture stamps, and the formula trace showing how net and charge were derived.

Beyond the per-tab drawer, every field and control has an unobtrusive **help control** that opens
concise, translated guidance — what this does, why it matters, what a good value looks like, and
what happens if it is wrong.

- Help text lives in `config`, so it is editable without a release and travels with backups.
- Fully localised into `en` and `ta` alongside labels.
- A **Help** section collects everything into a searchable manual, available offline.
- **First-run guided setup** walks an installer through indicator, printer, cameras and site
  details in order, with the same help text inline.

---

## 12. Access and protection

v1 had **ten separate passwords** — licence, unlock, camera, SMS, invoice, manual entry, edit
enable, reset, login and trial. Ten passwords is nine too many.

**One admin password protects all configuration.**

| Level | Who | Can |
|---|---|---|
| **Operator** (default, no login) | Anyone at the PC | Weigh, print, search, view reports |
| **Admin** (password) | Owner / installer | Everything: settings, schema, templates, indexes, masters, void, edit-after-print, resets, backup, licence |

**How admin is entered — locked in the demo, round 4.** A 🔒 chip sits in the top bar beside the
operator name. Click it, type the admin password, and it becomes 🔓 **Admin**.

- The unlock is a **session unlock**, not a second login. No sign-out, no user switch.
- It lasts **ten minutes**, or until the chip is clicked again to re-lock. The window is
  configurable.
- While locked, Settings renders read-only — every gated control is disabled and a banner offers
  the unlock — rather than hiding the screen. An owner can *see* how the site is configured without
  being able to change it, which is what a support call actually needs.
- **Appearance is deliberately not gated.** Theme, text size and language are operator comfort, not
  configuration. An operator on the night shift must be able to switch to the night skin or make
  the type bigger without phoning the owner for a password.

- Optional named operators — pick a name, no password — so tickets record who weighed. This
  satisfies "who was the operator" without imposing login on a non-technical site.
- Optional real user accounts with passwords and roles, for sites that want them.
- Individual actions can be marked **protected**, requiring the admin password at the moment of
  use, with a configurable re-prompt window.
- Admin password is Argon2id hashed, with a recovery procedure tied to the licence.
- Every protected action is written to `audit` with actor, before and after.

---

## 13. Look and feel

A **virtual instrument** aesthetic: the software should feel like a precision machine, not a form.

- **The weight display is the hero** — a virtual indicator replicating a real LED head: large
  seven-segment-style digits, glow, stability lamp, unit and capacity markings. Readable across
  the room, unmistakable at a glance.
- Live **live → stabilising → stable** state, with the capture control disabled until stable.
  Weight is only accepted after N consecutive stable readings — this single rule removes the most
  common cause of disputed weights.
- Depth and material: layered surfaces, soft shadow, restrained motion. Animation only where it
  conveys state, never decoration.
- Camera tiles live beside the weight, so the operator sees weight and vehicle together.
- Responsive 360px → 4K. Large touch targets. High contrast throughout.

**Skins — locked in the demo, rounds 3 and 4.** Six, each a set of ~14 CSS custom properties on
`:root[data-skin]`. No component ever names a colour; a skin is a saved settings value, not a code
change. The picker is a row of compact pills with a swatch — not description cards.

| Skin | For |
|---|---|
| **Indicator** (default) | Amber on black — the colour of a real weighbridge head |
| **Graphite** | Cool dark, teal accent. Calmer over a twelve-hour shift |
| **Night shift** | Near-black, no blue light, deep orange. The 2 a.m. cabin |
| **Paper** | Warm light, burnt orange. Reads like the printed slip |
| **Daylight** | Cool light, blue accent. A bright office window |
| **High contrast** | Black, white and yellow. Dust, glare and cheap glass |

**Text size** is a four-step control (A− A A+ A++) driving `html { font-size: calc(16px * var(--s)) }`,
with every size in the app expressed in `rem`. It scales the whole interface, not one label. Sites
with a monitor on the far wall run A++ all day.

**Keyboard first — operators do not use a mouse.**

- **`Enter` moves to the next control, exactly like `Tab`, and it walks onto the buttons too.**
  Locked in the demo, round 4. `Enter` never *fires* a button — `Space` does that. This is the
  data-entry pattern operators already have in their hands from older software: one hand on the
  keyboard, eyes on the lorry, `Enter` `Enter` `Enter` down the ticket and into the actions.
- `Shift+Enter` walks backwards. Navigation is scoped to the visible screen, or to the open dialog.
- `Escape` closes the topmost thing — popover, then dialog, then drawer.
- Function keys capture and print, and a command palette reaches everything.

### 13.1 Navigation and information architecture

**Locked in the demo, round 4.** Six tabs, in this order, with no sidebar:

**Dashboard · Weighing · Cameras · Reports · Masters · Settings**

The app opens on **Weighing** — the indicator is the reason the software is running — even though
Dashboard sits first in the bar.

**There is no Tickets tab.** It was merged into Reports, because a ticket list *is* a report that
has not been grouped yet — the same rows, the same date range, the same print button, the same
exports. Reports carries one toggle:

| View | Shows |
|---|---|
| **Tickets** | Every row, searchable, filterable by whether the second weight is in. Resume or reprint from the row |
| **Summary** | The same rows grouped by material, party, vehicle or transporter, with totals |

Resuming a parked ticket also lives on the Weighing screen as the open-ticket strip (§7.5), because
that is where the operator is standing when the lorry comes back.

On a phone the tab bar becomes a five-slot bottom nav — Dashboard, Weighing, Cameras, Reports, More
— with Masters, Settings and Help behind **More**. The indicator head shrinks to a compact bar on
every screen except Weighing.

**Settings is itself split into six panes**, so no single screen becomes a wall:
Fields & language · Print & printers · Appearance · Weighing · Connections · System.

---

## 14. Backup and portability

- **Scheduled** and **manual** backup of the complete database, including media and configuration.
- Every backup **verified by checksum immediately after writing** — an unverified backup is not a
  backup.
- Targets: local folder, USB, network share, or cloud (S3-compatible / consumer drive).
- **Restore wizard** with preview: what it contains, when it was taken, what will change.
- Retention: keep N daily, N weekly, N monthly; prune automatically.
- **Portable bundle** — one signed file with records as streaming NDJSON, configuration, templates
  and optionally media, with a manifest and checksums. Selective by date range and type,
  idempotent, previewed before commit, and creating a restore point on import.
- Excel and CSV import/export for external use, with formula-injection escaping on export
  (matching VaultBill's `importEngine` policy).

---

## 15. Print engine

**Templates are a structured document model, not HTML.** HTML cannot drive a dot matrix — no print
head, no character grid, no control codes. HTML-only forces a parallel implementation for raw
printers, which is exactly how forty print methods accumulated.

The right framing is **one content model, three layout engines** — not one layout compiled three
ways. Dot-matrix layout is a genuinely different design task from A4, and pretending otherwise is
where this abstraction breaks.

```
DocumentModel  (content, bindings, conditions — target-independent)
   ├─ PaperLayout    → HTML/CSS → PDF        rich, proportional, full Unicode
   ├─ GridLayout     → character grid → ESC/P  fixed columns, Latin only
   └─ ReceiptLayout  → ESC-POS                 32/42/48 cols, native QR
```

Per-target layout overrides live **in the template**, and any block may declare
`Targets: ["Paper"]` to be excluded from raw output entirely — camera photographs on a dot matrix
are pointless, which is exactly why v1 needed a separate "WebCam Print" format.

### 15.1 A template is authored in a wizard, not a text box

**Locked in the demo, round 4.** A template is not just a layout — it is a layout *plus the paper it
lands on plus how it is sent*. Uploading an HTML file and stopping there leaves the operator to
discover the margins are wrong on paper. The wizard asks the three questions in order:

| Step | Asks |
|---|---|
| **1 · Layout** | Name, which document (ticket or report), which of the three layout engines, and the HTML — uploaded, or the built-in layout |
| **2 · Paper** | A preset (A4, A5, half A4, 80-col 241×127 or 241×152, 58 mm roll, 80 mm roll) or **Custom**, then width, height, orientation and all four margins in mm. Continuous rolls take height `0` |
| **3 · Output** | Which printer, how many **copies**, whether this becomes the default for its document — with a live preview rendered through the chosen engine |

Choosing a preset fills width, height, margins and the engine together, so the common case is one
click and the custom case is still fully open.

**Templates are then a managed list**, not a single uploaded file: every template shows its paper,
copy count and printer, and carries **Preview · Edit · Make default · Delete**. The default for each
document is what the Print button uses; the print dialog still offers every template for that
document as a tab, so an operator can send one ticket to the dot matrix without changing anything.

**Default printers are configured per class** — one for A4/laser, one for dot matrix, one for
thermal — because a site has all three and each template should arrive pointed at the right one.

### 15.2 The Windows print path — specified, because Tauri does not provide it

**PDF bytes cannot be sent to the Windows spooler as RAW** — the spooler will not rasterise them.
This step was undefined in earlier drafts and is the project's largest technical risk.

**Paper target:**
1. Render the template HTML in a hidden WebView2 window.
2. `ICoreWebView2_16::PrintToPdfStream` → PDF **in memory**, never a temp file (§2 principle 3).
3. Rasterise with **pdfium** (`pdfium-render`) at the printer's DPI.
4. `OpenPrinter` → `StartDocPrinter` → `WritePrinter` → `EndDocPrinter` for N copies.

**Raw targets** go straight to steps 4 with `pDatatype = "RAW"`, bypassing all drivers — which is
the only way dot matrix printing is fast.

All COM interop is confined to one module, extending the `unsafe` carve-out in §19 from "the Win32
print module" to cover WebView2 print interop, with every block documenting its invariant.

**Printer capability profiles are data, not code** — stored in `config` as
`config_kind = 'PrinterProfile'`: columns, codepage, and the init/reset/cut/bold/double-height byte
sequences. Epson LX, TVS MSP and generic 3-inch thermal units all differ here, and a field
installer must be able to fix a printer quirk by editing configuration rather than waiting for a
release. That is design principle 1 applied to hardware.

### 15.3 Script support per target

ESC/P and ESC-POS have **no Tamil font** — only codepages. Printing Tamil script on them requires
rasterising shaped glyphs to bit-image data, which needs a full text shaper (Tamil has combining
marks and reordering) and is slow on a dot matrix.

| Target | Scripts |
|---|---|
| **Paper (A4/A5)** | Full Unicode — English and **தமிழ்** |
| **Grid (dot matrix)** | Latin characters only |
| **Receipt (thermal)** | Latin characters only |

So a site running the application in Tamil still gets an **English ticket** out of a dot matrix or
a thermal printer. This is a hardware limit, not a design choice. Two escapes exist if a site needs
Tamil on cheap paper, and neither is committed now:

- **Glyph rasterisation** — shape the Tamil run and send it as an ESC/P bit image. Correct, but
  needs a full shaper and is slow on a dot matrix.
- **Transliteration on the print path only** — a template may declare
  `"Script": "Latin"` on a field, and the print compiler transliterates Tamil values into Latin
  characters as it builds the character grid. Nothing about the stored record or the on-screen
  language changes.

The choice belongs to the template, not to the application language.

**Every target has a print preview**, rendered from the same compiled output that goes to the
printer — so what prints can always be verified on screen before paper is committed.

Blocks: `Page · Row · Column · Text · Field · Table · Image · Qr · Barcode · Line · Spacer ·
PageBreak · Conditional · Repeat`, each with per-target hints so a block renders richly on A4 and
degrades to 40 columns of text on a dot matrix from one definition.

Placeholder groups follow VaultBill's convention: `Ticket.*`, `Capture.*`, `Company.*`, `Party.*`,
`Totals.*`, `Asset.*`, `Secrets.*`.

Supported: pre-printed stationery mode with on-screen offset calibration · multi-copy with
per-copy watermarks (Original / Duplicate / Office) · conditional blocks so one template serves
several variants (replacing v1's local/other-state duplication) · **mass print** · reprint with
policy and audit.

**Visual designer** — drag blocks, snap to grid, bind fields from the schema, preview against a
real ticket, and see a **live preview per target** before committing. Templates import and export
as single files.

---

## 16. Cameras

**Up to 8.** USB (`nokhwa`), IP via HTTP snapshot, MJPEG, RTSP, with ONVIF discovery.

Per camera: name · enable · resolution · **crop rectangle** (carried forward from v1) · rotation ·
quality · retention. Automatic capture at every stage, burst with sharpest-frame selection,
**overlay stamp** (ticket no, weight, time, site) burned in so an image is self-describing once it
leaves the system, SHA-256 chained into audit, optional short clip, motion or presence trigger,
live tiles, and health monitoring. **A dead camera never blocks a ticket.**

**ANPR** — local ONNX model via the `ort` crate: fully offline, no cloud, no licence cost. Reads
the plate, fills the field, and flags mismatches against what the operator typed, retaining both.
Confidence is always shown; low confidence asks rather than assumes.

---

## 17. Hardware

- **Indicator** on a dedicated thread, streamed as events. **Protocol auto-detection** with a
  custom-pattern fallback so any indicator works without a code change.
- **Setup wizard**: choose port → watch raw bytes live → detected weight highlighted → confirm.
  This turns the hardest step of every installation into something a non-technical installer
  completes unaided.
- **Simulated indicator** for demo, training and development.
- Large LED display output · boom barrier and traffic light relays · vehicle presence sensor ·
  Tamil/English voice announcement via Windows TTS · RFID/barcode vehicle identification ·
  **SMS via serial GSM modem** (carried forward from v1) and via gateway.

---

## 18. Reports, trust and integrations

**Reports** — visual query builder over the dynamic schema, saved definitions, grouping and
pivots, dashboard (throughput, tonnage, revenue, top parties and materials, peak hours, turnaround,
device health), scheduled daily summary, print through the same document engine, export to Excel,
CSV, JSON and PDF, and reconciliation views for voids, amendments, manual entries and reprints.

**Trust** — the hash chain lives on **`audit` only**, never on `doc`. `doc` is mutable by design
(edit-enable, reweigh, void), and a chain over mutable rows breaks on the first legitimate edit:
recompute and the chain proves nothing, don't recompute and it reports tampering during normal
use. So `doc` carries a plain `body_hash` of its current content, and `audit` — which is
append-only — carries the chained hash of every state transition. Only then is "altering history
breaks the chain" actually true. Reprint and print counts live in `audit` for the same reason:
recording a reprint must not mutate the ticket. **Public QR verification**: every ticket carries a QR resolving to a page showing the
authentic weighment and its photograph, making forged slips worthless. **Anomaly detection**:
repeated identical weights, manual-entry clusters, out-of-hours activity, implausible turnaround,
ANPR mismatch, abnormal void/reprint patterns, zero drift. Findings are surfaced for review with
an explanation and can be dismissed with a recorded reason — **the system reports, it does not
accuse**.

**Integrations** — all behind one provider interface, all through the durable outbox, so none can
delay or lose a ticket. WhatsApp/SMS ticket delivery · cloud backup · public verification ·
**MiMaS (seam now, client later)** — Tamil Nadu has mandated e-permit-to-weighbridge integration
for all quarry and crusher units, making this a compliance moat.

**Remote access — Cloudflare Tunnel**, opt-in, off by default. Free, unlimited bandwidth, real
HTTPS on your own domain, outbound-only so the PC is never exposed, works behind CGNAT with no
router configuration. Tailscale offered as the private-mesh alternative. **Credentials go to the
Windows Credential Manager, never to a config file, never to the repository** — that was the real
defect in v2, not ngrok itself. No tunnel binary is committed.

---

## 19. Coding standards

Enforced by CI, not by review. Full detail in `docs/CodingStandards.md`; this is the contract.

### Size and complexity

Line count is a **bad proxy** — it punishes doc comments and control-code tables, the two things
we most want written. So complexity is the gate and length is only a signal.

**Hard gates (build fails)** — none can be inflated by documentation:

| Rule | Limit |
|---|---|
| **Function length** | 60 **code** lines (comments and blanks excluded) |
| **Cognitive complexity** | 15 |
| Nesting depth | 4 |
| Parameters | 4 (object beyond) |
| Duplicated blocks | none over 50 tokens |
| Layer cycles | none |

**Soft budget (warns only)** — code lines per category: components 200 · hooks 150 · engine
orchestration 300 · **print target compilers 600** · types 400 · **data tables, i18n, generated
and tests unlimited**. A file that genuinely should be longer declares
`/** @maxLines 900 — reason */`, which CI accepts and lists, so every exception is visible and
justified rather than silently bypassed.

**The structural answer first.** A long print compiler is usually data wearing a function's
clothes — extract the ESC/P and ESC-POS control-code tables into `codes/` (data, unbudgeted) and
the compiler becomes short and the data more discoverable. Split by responsibility, extract data,
or annotate — in that order. **Never compress good code to satisfy a number.**

### TypeScript

`strict` · `noUncheckedIndexedAccess` · **`any` banned** · ESLint flat config with
on real-bug rules · Prettier (auto-applied, never a gate) · 4-space indent · arrow-function
exports · **`imports:check` script enforcing import order** (external → aliased → relative, blank
line between groups) · no wildcard imports · no default exports outside routes · Zod at every
boundary · `ts-pattern` for exhaustive matching. **No business logic in components** — it lives in
`engines/`.

### Naming

`PascalCase` components and files · `useThing.ts` hooks · `camelCase` variables ·
**`PascalCase` JSON keys** (matching VaultBill) · `snake_case` SQL · `SCREAMING_SNAKE` constants.

### Rust

`rustfmt` · `cargo clippy -- -D warnings` · **`unwrap()`/`expect()` banned** outside `main.rs` ·
`thiserror` + `Result` throughout · `unsafe` only in the Win32 print module, every block commented
with its invariant.

### What CI actually blocks

**Only correctness and security.** A build that fails over style is a build that gets bypassed.

| Blocks | Auto-applied | Advisory |
|---|---|---|
| typecheck · build · secret scan · real-bug lint rules (`no-explicit-any`, `no-floating-promises`, `import/no-cycle`, empty catch, Rust `unwrap`) · clippy `correctness`/`suspicious` | Prettier · import order · rustfmt — all run `--write`, never fail | function length · cognitive complexity · file budgets · duplication · missing i18n keys · Conventional Commits |

No build output committed, ever. Full detail in `docs/CodingStandards.md`.

### Documentation

Every engine has a `README.md`. `docs/` carries `CodingStandards.md`, `DecisionLog.md`,
`Terminology.md`, `JsonConfig.md`, `PrintTemplate.md`, `FormulaNotes.md`, `Security.md`,
`ReleasePipeline.md` — mirroring VaultBill.

---

## 20. CI/CD

### 20.1 Release — single MSI

`.github/workflows/release.yml`

```yaml
name: release

on:
  push:
    tags: ['v*']
  workflow_dispatch:

permissions:
  contents: write

jobs:
  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - uses: dtolnay/rust-toolchain@stable

      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - run: npm ci

      - name: Quality gates
        run: |
          npm run format:check
          npm run imports:check
          npm run lint
          npm run typecheck
          npm run size:report
          cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
          cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

      - name: Build installers
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'BabuScales ${{ github.ref_name }}'
          releaseDraft: true
          args: --bundles msi,nsis
```

Produces `BabuScales_x.y.z_x64_en-US.msi` plus an NSIS `.exe`, attached to a draft release.
`tauri.conf.json` sets `webviewInstallMode: offlineInstaller` so sites with no internet install
cleanly — that bakes the full WebView2 Evergreen Runtime into both installers, so expect ~200MB
each (see §5's footnote), not the small download-stub size Tauri ships by default. Code signing
later is two secrets and no restructuring.

### 20.2 GitHub Pages — the app with no database

`.github/workflows/pages.yml`

```yaml
name: pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      # The same application. Only the DataPort implementation differs.
      - name: Build no-database build
        run: npm run build
        env:
          VITE_DATA_ADAPTER: memory
          VITE_BASE: /babuscales/

      - name: SPA fallback for deep links
        run: cp dist/index.html dist/404.html

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - id: deploy
        uses: actions/deploy-pages@v4
```

### 20.3 Pull requests

`.github/workflows/ci.yml` — format, imports, lint, duplication, typecheck, clippy, rustfmt,
secret scan and a debug build on `windows-latest`, plus the **advisory** size report:

```yaml
      - name: Size report (advisory)
        run: npm run size:report -- --comment
        continue-on-error: true
```

`continue-on-error` is deliberate: **size never blocks a merge.** The failing gates are function
length, cognitive complexity, nesting, parameters, duplication and cycles — all enforced by
ESLint and clippy, none of which can be tripped by writing good documentation.

---

## 21. Roadmap

**Phases 0–7 are built**, cross-checked against the code, not aspirational. This table records
final status per phase; the real backlog is the "What's left" list right after it. Full task-by-task
narrative — what shipped, what was cut and why — lives in `app/README.md`'s numbered "Where to
start" list and its "Known gap" section; per-feature current state lives in `docs/Features.md`.

| Phase | Scope | Status |
|---|---|---|
| **0 Groundwork** | Site presets, hardest print format, WebView2→pdfium spike | Superseded — shipped without the presets/pdfium spike; printing goes through the OS dialog instead (see "What's left") |
| **0.5 Mock** | Four review rounds on `demo/BabuScales-demo.html`, the reference spec for Phase 1 (§22) | **Done** |
| **1 Foundation** | Scaffold, fixed schema, `DataPort` + adapters, component library, i18n, help framework, CI gates, backup/restore from day one | **Done** |
| **2 Core** | Schema engine, formula engine, capture model (§7.1/§7.4/§7.5), masters + search, indicator, hash chain on `audit` | **Done** — formula engine is built and tested but not yet wired to live billing (Charge/Value are hand-computed) |
| **3 Print** | Content model, three layout engines, six real v1 formats, printer capability profiles | **Done, scoped down** — no Windows RAW/ESC-P spooler path (§15.2); printer profiles are a curated fixture list, not per-printer capability lookups |
| **4 Capture** | 4(→8) cameras, crop, overlay, ONVIF/RTSP, clips, retention, live view | **Not really done** — cameras are the reference mock's own decorative fixture; no real USB/IP/RTSP capture exists |
| **5 Insight** | Reports, dashboard, Excel/CSV export, custom indexes, mass print | **Done** — "custom indexes" are named report-view presets, not real expression indexes (`indexEngine` is an empty stub) |
| **6 Trust & release** | QR verification, licensing, installer, docs, landing page | **Done** — not yet pushed to a remote, so CI and the Pages demo have never actually run |
| **7 Reach** | Remote access, email/SMS, scheduled reports, multi-gross, legacy v1/v2 import, MiMaS, Android | **Done except MiMaS** (blocked, no spec) **and WhatsApp** (permanently decorative, by decision — no compliant free delivery path) |
| **8 Deferred by decision** | **ANPR** · **visual template designer** · **anomaly detection**. Designed for, not built | Correctly still untouched |
| **9 Tests** | Full suite — last phase, by decision | **Paused mid-flight** — `src/components/`, `src/constants/`, `src/engines/formulaEngine/` covered (114 tests); rest on hold by explicit request |

### What's left — ordered by effort, smallest first

Task #62 was a four-way parallel review (frontend, Rust backend, build/CI/docs, dependency scan)
run after the `_styles/`/`__tests__/` folder migration. Its **security/correctness findings are
already fixed** — folded below into the list they belong to, not kept as a separate task. What's
left is the actual remaining engineering backlog, smallest lift first so it can be worked down in
order. Business and design **decisions** (pricing, logo, MiMaS spec, etc.) are not engineering
effort and are not this list — they live in §23, set aside on their own.

**Small — a session or less each — all done**
- ~~`docs/CodingStandards.md` drift cleanup~~ — done. Removed the Husky pre-commit-hook, `clippy.toml`,
  `docs/DecisionLog.md` and `quality:report` claims, and the ~9 undocumented `components/` primitives
  (`Sidebar`, `Topbar`, `AppConfirmDialog`, `FeedbackStates`, etc.). `CameraTile` moved from
  `features/cameras/` into `components/CameraTile/` (barrel + `.types.ts` + `_styles/`), closing the
  layering violation the doc itself warned against.
- ~~Dependency upgrades~~ — done. `zod` 3→4 (`z.record()` two-arg fix in `db/schemas.ts` and
  `i18n/schemas.ts`), `typescript-eslint` → `^8.67.0` (`typescript` held at `^5.7.3` as required), Rust
  `windows` → `0.62`, `thiserror` → `2`. `cargo clippy`/`fmt --check` and `npm run typecheck`/`lint:strict`/`build`
  all clean.
- ~~Reports date-range filter~~ — done. `filterRowsByDateRange` in `reportRows.ts`, two native
  `<input type="date">` inputs (`ReportsDateRangeRow`) scoping both Tickets and Summary views plus
  print/export; the open-ticket strip's `waitingCount` deliberately stays unscoped by date (§7.5).
- ~~License enforcement hard-block in Rust~~ — done. `licensing::require_licensed` re-derives license
  state from the `config` table independently of the frontend and gates `save_doc`, closing the
  bypass where a direct `invoke("save_doc", ...)` skipped the frontend's `licenseGated` check.
- ~~OS-level scheduler for the daily summary~~ — partially done, honestly: still an in-app check, not
  a real background/OS-level scheduler, but it now catches up immediately on launch if a whole day
  was skipped (machine off/app closed at the scheduled time), rather than silently staying silent
  until the next scheduled time next day. True OS-level scheduling remains unbuilt.

**Medium — a focused multi-day effort each**
- ~~Expression-index manager (§6.3)~~ — MVP done (create/list/drop). Definitions persist as `config`
  rows (`ConfigKind: "Index"`) via the existing generic config commands; the two genuinely new
  DataPort methods (`createCustomIndex`/`dropCustomIndex`) run the real `CREATE INDEX`/`DROP INDEX`
  DDL server-side. SQLite can't parameterise identifiers, so every string that reaches
  `conn.execute` is validated first: `table` is a closed Rust enum (not a free string), the JSON path
  and the derived index name are each checked against a strict letters/digits/underscore allowlist
  (`src-tauri/src/commands/indexes.rs`), and `drop_custom_index` re-validates the name read back from
  its own stored config row before using it — never trusting a value just because this code wrote it.
  Drop is a soft-delete (`Body.Active = false`) rather than a new generic delete-config method.
  Admin-gated Settings card (`IndexManagerCard`). Out of scope: size/usage stats, slow-query
  suggestions, and wiring query code to actually use these indexes.
- A background outbox worker — webhook, cloud backup, Tally export and the outdoor display board
  toggles persist with no worker draining them; email/SMS/verification are a synchronous "drain of
  one" at print time, not a retry queue.
- ~~FTS5 + virtualised/keyset-paginated Masters search at scale~~ — keyset pagination done (not FTS5
  or virtualisation, still out of scope). `MasterQuery.After: {Name, MasterId}` composite cursor
  (`Name` alone isn't unique), threaded through the Rust `list_masters` SQL (parameterised
  `:after_name`/`:after_master_id`, explicit `COLLATE NOCASE` since a SQLite row-value compare would
  disagree with the `NOCASE` `ORDER BY`) and the memory adapter identically. New `useMasterListPage`
  hook drives the visible Masters list with its own paginated round-trips + a "Load more" button;
  `useMasterCache` (record selection, forms, every `SearchableDropdown`) is untouched, so it still
  loads a whole kind up front — true memory-footprint relief at 100,000+ rows needs that hook changed
  too, tracked as the remaining gap.
- Wire the formula engine to live billing — `Charge`/`Value` are hand-computed, not
  formula-evaluated, even though the formula engine itself is built and tested.
- i18n content coverage — the Weighing feature is now routed through translation (39 new keys;
  `OpenTicketStrip`/`RecallBanner`/`ActionsCard`/`CalcCard`/`TicketFieldsCard`/`WeighingRightColumn`).
  Every other feature (Dashboard, Reports, Masters, Settings, Cameras) is still hardcoded English —
  this was deliberately scoped to one bounded increment rather than the whole app.
- ~~Multi-gross: an itemised per-load print line~~ — done. `SlipData.GrossLoads` (one entry per Gross
  capture) threaded through `buildSlipData`/`useSlipData`, a compact per-load table on the A4 slip
  (`SlipLoadsTable`), and matching lines in both mono renderers; length <= 1 renders identically to
  before, so a non-multi-gross ticket's printed output is untouched.
  "Park a ticket mid-sequence" — investigated, turned out to already be how the feature works, not a
  gap: captures accumulate unsaved on screen while the operator keeps adding Gross loads (`kind` stays
  offering "Gross" the whole time under MultiGross — `ActionsCard`/`captureStatus.ts`), and Save is the
  explicit "finish this ticket" action regardless of how many loads it holds (`weigh.bothWeightsCaptured`
  / `weigh.captureAnotherGross` strings say so outright: "Save to finish this ticket"). There's no
  scenario where a ticket needs to be *saved* mid-sequence and resumed later with more loads still to
  add — that would mean inventing new state-machine semantics the mock/PLAN never called for. Left
  `useWeighingTicket.ts`'s lock-on-`captures.length>=2` and `ticketBody.ts`'s `isOpenTicket` exactly as
  they are.

**Large — genuine subsystem work**
- Schema-driven generic field rendering, and `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen`/`Validate`
  formula evaluation against the ticket (§8) — a custom field validates and saves but renders no
  input today.
- Windows RAW/ESC-P spooler path (§15.2) — all printing still goes through the OS print dialog;
  this was always flagged as the project's largest technical risk (WebView2→pdfium→spooler, §15.2).
- Real camera capture (USB/IP/RTSP/ONVIF) — cameras are currently decorative (Phase 4).

**Deferred by decision (Phase 8, unchanged)** — ANPR, visual template designer, anomaly detection.
Designed for, not built; revisit only if the decision is revisited.

**Blocked externally** — MiMaS, no spec yet (§23.3). Nothing to schedule until one arrives.

**On tests.** Your call stands and I will not revisit it. Recorded once so the trade is explicit:
the risk is not retrofit effort — `engines/` are pure, so tests drop in cleanly — it is that silent
failures (decimal rounding, ESC/P column arithmetic, capture timestamps) write permanently wrong
data into records that §18 hash-chains as authentic and §7.4 never deletes. Two structural
mitigations are built in regardless: every engine is a pure function testable the moment you want
to, and **every print target has an on-screen preview** so output is verifiable by eye before paper.

---

## 22. The interactive mock — the reference specification

**Status: locked, four rounds of review complete.** `demo/BabuScales-demo.html` is a single
self-contained file, no build step, no dependencies, no database. It is the **visual and behavioural
specification** for Phase 1: where a disagreement arises between this document and the mock, the
mock is what was actually reviewed and approved.

What it demonstrates, all of it working:

| | |
|---|---|
| **Weighing** | Simulated indicator with a real stability gate · explicit Tare/Gross selector · open-ticket strip · park-and-resume across many lorries · previous-value recall with tare-expiry logic · capture stamps with operator |
| **Fields** | Vehicle, Party, Material and Transporter search the masters with keyboard navigation and add-as-you-go · formula trace for net, charge and value |
| **Status** | The one status (§7.4) rendered identically in the ticket header, both tables and help |
| **Reports** | Tickets and Summary from one dataset, four groupings, live totals |
| **Masters** | Parties, Materials, Vehicles with stored tares and expiry |
| **Settings** | Six panes, admin session lock, schema upload, language-pack upload, print-template wizard with a managed list, per-class default printers, serial port and integrations, manual/auto numbering |
| **Print** | All three layout engines rendering the same content model, template tabs, DUPLICATE stamping |
| **Shell** | Six skins · four text sizes · English ↔ Tamil · `Enter`-as-`Tab` · per-tab help · phone layout with bottom nav |

**Carried into the build as-is:** the token names, the status component, the strip, the popover, the
wizard's three steps, the settings pane split, and the keyboard model.

**Deliberately faked, and must be built for real:** serial I/O, the database, printing, cameras,
the hash chain, and the formula parser (the mock hard-codes three formulas).

---

## 23. Open questions

**Set aside from §21 on purpose.** Nothing here is engineering effort this team can just go and do
— each one needs a decision, an asset, an external party, or a standing authorization before any
code changes. Resolved items removed rather than left checked off — see git history if the earlier
record is ever needed. Every item in §21 is actionable without waiting on any of these.

1. **The logo.** The current mark — `BS` on a weighbridge deck — is a **placeholder** standing in
   as the constant Babulens maker's mark, both in `demo/`'s SVG and the generated Tauri app icon
   set (`app/src-tauri/icons/`) — one swap, two places, once real design lands. Needs: a design
   decision, not an engineering task. Blocks: shipping with real brand identity.
2. **Starter print templates and the visual designer.** Which 5–8 template designs ship, authored
   through what tool — the three built-in layouts are all that exist today. Deferred by decision
   into Phase 8 (§21) until this is decided; the designer itself is real engineering effort once
   scoped, but the scope depends on this decision first.
3. **MiMaS specification.** Tamil Nadu's e-permit-to-weighbridge integration mandate — task #48 is
   blocked on it, not in progress. Needs: the spec from the external body. Nothing to build without it.
4. **Pricing and licence tiers.** The 14-day trial length and the vendor Ed25519 signing key
   (`tools/license-format`) are both explicit placeholders standing in for this decision — the
   signing key in particular must not go out with any real licence. Needs: a business decision on
   what a licence actually costs and what it unlocks.
5. **Rotate the ngrok authtoken committed in v2's `ngrok.yml`.** Inherited from the prior product,
   not present in this repo. Needs: access to whatever system still holds v2's history — outside
   this repo's control entirely.
6. **Push to the configured GitHub remote.** `origin` is set (`git@github.com:Moleesh/babuscales.git`),
   `.github/workflows/{ci,pages,release}.yml` are authored and valid, but none has ever run — CI has
   never checked a real push, and the Pages demo has never deployed. Needs: an explicit go-ahead to
   push (standing project rule — this is an authorization gate, not a missing decision, but it belongs
   here rather than §21 because no engineering work follows from deciding it beyond confirming the
   three workflows go green).

**Resolved, not open:** admin unlock window — ten minutes, implemented and confirmed as-is;
revisit only if a site actually asks.
