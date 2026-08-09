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

## Known gap

The Rust side compiles, links and is verified (`cargo check`/`clippy`/`fmt` all pass; the store and
backup modules were exercised with real `cargo run` examples), but **no Tauri commands exist
yet** — `src-tauri/src/commands/` is still just a module doc comment, and there is no `tauri`
`DataPort` adapter in `src/db/adapters/`. The desktop build cannot talk to SQLite from the
frontend yet. That wiring is Phase 2 work, done alongside the features that first need it.

## Carried over from the mock, verbatim

- `src/styles/tokens.css` — the six skins, as ~14 custom properties each.
- The status component (tare · gross · net), the open-ticket strip, the search popover, the
  three-step template wizard, the six-pane settings split, and the `Enter`-walks-everything
  keyboard model.

## Faked in the mock — build for real

Serial I/O · the database · printing · cameras · the hash chain · the formula parser.
