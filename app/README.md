# BabuScale — application

The build. Planning lives one level up in [`../PLAN.md`](../PLAN.md); the approved interactive mock
is [`../demo/BabuScale-demo.html`](../demo/BabuScale-demo.html).

> **The mock is the specification.** Four review rounds are locked into it. Where this folder and
> `PLAN.md` disagree about how something looks or behaves, the mock is what was reviewed and
> approved — see PLAN §22.

---

## Stack

Tauri v2 · Rust · React 19 · TypeScript · SQLite. Rust is confined to hardware, storage and
transport, targeting **under 15% of the codebase**. All domain logic is TypeScript so it runs
identically on desktop, LAN, the browser demo and Android.

## Layout

```
app/
├─ src/
│  ├─ components/     reusable, feature-agnostic — the design system
│  ├─ engines/        pure logic. No React, no IO, no Tauri
│  ├─ features/       screens, composed from components + engines
│  ├─ db/
│  │  ├─ DataPort.ts  the one contract
│  │  └─ adapters/    tauri · memory · http
│  ├─ i18n/           en · ta, plus uploaded language packs
│  ├─ styles/         design tokens — the six skins
│  └─ constants/
├─ src-tauri/src/     commands · store · devices · print · outbox · net · security
└─ public/
```

**Rules — enforced in review, and later in CI:**

- A component in `features/` may not define a styled primitive. If it needs one, it belongs in
  `components/`.
- `engines/` are pure functions. This is what makes them testable in Phase 9.
- Folder-per-component with an `index.ts` barrel.
- Internals in `_private/`.
- Files over 300 lines split into a `*Support.ts` companion.
- No component names a colour. Every colour comes from a token in `styles/tokens.css`.

Full standards: [`../docs/CodingStandards.md`](../docs/CodingStandards.md).

---

## Where to start

Phase 1 order, from PLAN §21. Nothing here depends on work scheduled later. **All seven steps
below are done and verified** — typechecked, linted, and exercised at runtime (in the browser for
the frontend, via throwaway `cargo run` examples for the Rust store, deleted once they passed).

1. **Scaffold** — Vite + React 19 + TS, Tauri v2 shell, path aliases, lint and format config. ✅
2. **`DataPort.ts`** — the one contract, then the **memory adapter first**. The memory adapter is
   what makes the GitHub Pages demo the real application with no database, so it is not a test
   double; it is a shipping target. ✅ Verified: doc lifecycle, idempotent seq allocation, series
   reset, master search, config versioning, asset metadata/bytes split, the audit hash chain, and
   a full backup/restore round trip including binary asset bytes.
3. **Fixed schema** — create-once tables per PLAN §6.1, plus the additive-only idempotent startup
   patch runner. No migrations, ever. ✅ `src-tauri/src/store/` — schema applies idempotently
   (run twice, no error), 17 real `sqlite_master` tables including FTS5 shadows, a JSON round trip
   through `doc.body` verified.
4. **Design system** — port the mock's tokens and components. `tokens.css` is carried over
   verbatim and verified. ✅ `AppShell`, `Button`, `StatusPill`, `WeightDisplay`,
   `ContextualHelp` and the Enter-as-Tab keyboard hook are built and verified — the remaining
   components in PLAN §10 (`DataTable`, `SearchableDropdown`, `CameraTile`, `CaptureTimeline`,
   `AppModal`/`AppDrawer`/`AppPopover`, `Field` variants, `EmptyState`) are deliberately deferred
   to when the feature that needs each one is built (PLAN §21 Phase 2+), not built speculatively.
5. **i18n + help framework** — language packs as rows, field labels inside field definitions
   (PLAN §8.3). ✅ `src/i18n/` — English baseline, `LanguagePack` + `Localized` types and Zod
   schemas, `I18nProvider`/`useTranslation`, and the per-tab help drawer (`ContextualHelp`) with
   content ported from the mock's `HELP` object. Verified: a pack overrides a subset of keys, a
   missing key falls through to English, the drawer takes over the Enter-walk scope while open.
6. **Backup and restore** — from day one. Real data must never exist without backup. ✅ Memory
   adapter covered in step 2. `store::backup_database`/`restore_database` (`src-tauri/src/store/backup.rs`)
   use `VACUUM INTO`, an integrity check, and a SHA-256 checksum — verified: a corrupt backup is
   rejected, a valid one restores real data into a fresh file.
7. **CI gates + README + Pages demo live.** ✅ `.github/workflows/{ci,pages,release}.yml`
   authored per PLAN §20, `eslint.config.js` rule severities corrected to match
   `docs/CodingStandards.md`'s blocking/advisory split exactly, `npm run size:report` is a real
   file-budget checker (with `@maxLines` support), `npm run scan:secrets` uses `secretlint`. **Not
   yet live**: this folder isn't pushed to a GitHub remote yet, so the Pages workflow has never
   run — see the open item in `../PLAN.md` §23.

**Phase 2 — the features, in build order.** All built against the memory adapter (the same one
that makes the Pages demo real), typechecked, linted (zero blocking errors) and exercised end to
end in-browser (send a lorry → capture Tare → capture Gross → Save → the ticket appears correctly
on Reports and Dashboard).

8. **Formula engine + `Decimal`** — `src/engines/formulaEngine/` — a small arbitrary-precision
   decimal type and a tokenizer/parser/evaluator over it (PLAN §6.6, §8.1). ✅
9. **Schema engine** — `src/engines/schemaEngine/` — the field-definition type system and
   `DEFAULT_TICKET_SCHEMA`. ✅ Wired into Weighing for field _labels_ only so far — see Known gap.
10. **Ticket/capture model** — `src/db/ticketBody.ts` (the `Capture[]` shape, `deriveWeights`,
    `isOpenTicket` — PLAN §7.1/§7.4/§7.5) and `DataPortProvider`/`useDataPort`. ✅
11. **`SearchableDropdown` + `Field`** — `src/components/SearchableDropdown/`,
    `src/components/Field/` (`Field`, `FieldGrid`). ✅
12. **Simulated indicator** — `src/engines/indicator/` — ports the mock's tick physics exactly
    (`TICK_MS`, `SETTLE_TICKS`, damped approach then settle-jitter). `IndicatorSource`'s
    `loadLorry`/`reset` are optional so a future real serial adapter isn't obliged to implement
    demo-only controls. ✅
13. **Masters** — `src/features/masters/` — one screen, eight `MasterKind`s, `useMasterCache` for
    client-side cached search. ✅
14. **Weighing** — `src/features/weighing/` — the real screen: capture, recall, open-ticket strip,
    save/lock/print-count, all PLAN §7 rules end to end. ✅
15. **Reports + Dashboard** — `src/features/reports/`, `src/features/dashboard/` — one ticket
    dataset (`reportRows.ts`) feeding both the Tickets/Summary report and the KPI/hourly/material-
    split dashboard, with real (not simulated) numbers. The Weighing ticket hook is lifted to
    `App.tsx`'s `Shell` so Reports can resume a ticket into the same deck across a tab switch. ✅
16. **Desktop wiring — the Tauri `DataPort` adapter.** New files under `src-tauri/src/store/`
    (`docs.rs`, `masters.rs`, `configs.rs`, `assets.rs`, `audit.rs`, `outbox.rs`) — real SQLite CRUD
    mirroring the memory adapter's exact semantics, including anti-gap `doc_seq` allocation inside
    `BEGIN IMMEDIATE` and the `audit` hash chain.
    One command per `DataPort` method in `src-tauri/src/commands/`, an `AppState` opening the one
    database file at startup, and `src/db/adapters/tauri/` on the TS side — the same contract, one
    `invoke()` call per method. `npm run dev:tauri`/`build:tauri` (via `cross-env`) are what
    actually select this adapter; a plain `npm run dev`/`build` still defaults to memory. ✅
    Verified: `cargo check`/`clippy -D warnings`/`fmt --check` clean, a full binary build succeeds,
    and a throwaway `cargo run --example` (deleted once it passed, same as steps 2/3) exercised
    every operation against a real file — including a corrupted-mid-transaction-proof numbering
    reset and a genuine backup → mutate → restore round trip that proves restore replaces rather
    than merges. Also verified by inspecting the actual built bundle: `VITE_DATA_ADAPTER=memory`
    (the Pages demo) still ships zero Tauri code, `VITE_DATA_ADAPTER=tauri` ships it — the "branch
    not taken is never bundled" guarantee holds in both directions.
17. **Settings — the admin gate, for real.** `src/features/settings/` — a persisted `Settings`
    config row (weighing rules, stability gate, ticket numbering, date/time/amount formats, a
    salted-SHA-256 admin password hash), `SettingsProvider`/`useSettings`, and the mock's six-pane
    split (`SettingsScreen`). Weighing and System are fully wired against that row; the other four
    panes are documented placeholders (see Known gap). The top-bar admin chip
    (`AdminChip`) and unlock modal (`AppModal`, newly built — PLAN §10's deferred component,
    built now that a feature needs it) gate every pane's controls, with the mock's own 10-minute
    silent auto-lock. `Rules.TareFirst`/`StrictTare`/`AutoCapture` reach `useWeighingTicket` and
    `WeighingScreen` live ("Applied immediately", per the mock's own card header); the Stability
    gate reaches the simulated indicator's settle physics the same way. Ticket numbering's
    prefix/width reach `formatTicketNo` live, and "Reset the counter now" calls
    `DataPort.resetDocSeries` for real. ✅ Verified: unlock/lock/wrong-password in-browser, a
    live prefix change reflected in the open-ticket strip's ticket number, and auto-capture
    firing a real Tare capture with no button press once enabled.

## Known gap

**No real serial-port indicator adapter** — Weighing only ever talks to the simulated one
(`src/engines/indicator/simulatedIndicator.ts`); a real adapter would live in
`src-tauri/src/devices/` behind the same `IndicatorSource` interface.

**Not built at all yet, so the tab still says "— Phase 2":** Cameras, login/operator accounts
(every capture is stamped with one hardcoded `DEMO_OPERATOR` — a per-operator login is separate
from the one shared admin password Settings now gates).

**Built, but deliberately smaller than the PLAN §9.1/§18 spec:**

- **Masters** — client-side substring search over a per-kind cache, not FTS5; a plain table, not
  virtualised/keyset-paginated; no merge-duplicates or bulk import/export. Fine at demo/site scale,
  not at 100,000 rows.
- **Master field richness** — generic Name/Notes only, except StoredTare. No GST fields on Party,
  no Vehicle↔VehicleType linkage.
- **Recall** (PLAN §9.2) — a simplified, statically-positioned inline banner (`RecallBanner`), not
  the mock's viewport-positioned popover.
- **Settings** — Weighing and System are the only two of the mock's six panes actually wired
  (see Phase-2 item 17); Fields & language, Print & printers, Appearance and Connections render as
  named placeholders, each pending the feature it would configure. Within System, ticket
  numbering is live but date/time/amount formats are only persisted — nothing else in the app
  (Reports, Dashboard, printed tickets) reads them back yet. The stale-tare threshold
  (`STORED_TARE_STALE_AFTER_DAYS` in `src/db/storedTare.ts`) stays a fixed constant — the mock
  itself never exposes it as a setting either (`ex:"expired"` is static demo master data, not
  computed from a configurable day count).
- **Schema-driven rendering** — Weighing pulls field _labels_ from `DEFAULT_TICKET_SCHEMA` but
  does not render fields generically from schema/formula config; that needs a Settings pane to
  edit `Schema` rows first.
- **Billing** — there is no rate/charge engine. Reports and Dashboard show ticket counts and net
  tonnage only; no Charge column, no Charge KPI (the mock's is a fabricated demo number).
- **Print/export** — Print and Reprint just increment a ticket's `PrintCount` and re-save; there is
  no real print composition, and Reports' Export PDF/Excel/CSV buttons are shown disabled rather
  than silently doing nothing.
- **`CaptureTimeline`** (named in PLAN's architecture list) was not built — Weighing's "Captured &
  calculated" card uses the mock's `.calc` three-box grid instead.
- **Dashboard's hourly window** (06:00–20:00) is a fixed default; there is no site-hours Setting.
- **Trust and integrations** (PLAN §18) — the hash chain, QR verification, anomaly detection,
  WhatsApp/SMS delivery, Cloudflare Tunnel/Tailscale remote access, MiMaS: none of it is built.

## Carried over from the mock, verbatim

- `src/styles/tokens.css` — the six skins, as ~14 custom properties each.
- The status component (tare · gross · net), the open-ticket strip, the search popover, the
  three-step template wizard, the six-pane settings split, and the `Enter`-walks-everything
  keyboard model.

## Faked in the mock — build for real

Serial I/O · the database · printing · cameras · the hash chain · the formula parser.
