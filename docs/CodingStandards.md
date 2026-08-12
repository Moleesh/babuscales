# Coding Standards

How BabuScales code is written. **Most of this is guidance, not a gate.**

The previous version was 12,070 lines in one file — these conventions exist to make that
impossible. But a build that fails over style is a build that gets bypassed, and a solo developer
does not need a machine arguing about aesthetics. So:

> **CI blocks on correctness and security. Everything else is auto-fixed or advisory.**

### 0. What actually stops a merge

Only these. All are things that are unambiguously broken, never matters of taste:

| Gate | Why it blocks |
|---|---|
| **Typecheck** (`tsc --noEmit`) | It does not compile |
| **Build** (debug, windows-latest) | It does not build |
| **Secret scan** | A leaked credential is unrecoverable — see §11 |
| **Real-bug lint rules only** | `no-explicit-any`, `no-floating-promises`, `no-misused-promises`, `import/no-cycle`, exhaustiveness. Each is a defect, not a preference |
| **Rust `cargo clippy`** *(correctness + suspicious groups)* | Same standard, same reasoning |

**Auto-fixed, never a gate:** formatting and import order — run `npm run format` /
`npm run imports:write` locally before committing (§12: there is no pre-commit hook doing this for
you yet). CI only *checks* formatting (`format:check`, advisory) rather than writing it, so a
forgotten `format` still merges — it just shows up as a report, not a failure. Nobody discusses
formatting, and nobody is blocked by it.

**Advisory — reported on the pull request, never blocking:** function length, cognitive
complexity, file size, duplication. These are signals for a human, and a human decides.

---

## 1. Size and complexity — all advisory

Line count is a **bad proxy** for whether a human can hold a file in their head, and it punishes
doc comments and control-code tables — the two things most worth writing. Complexity is the better
signal, but it is still only a signal.

### 1.1 Signals worth watching

| Rule | Guide | Reported by |
|---|---|---|
| Function length | 60 code lines | `max-lines-per-function` (`skipComments`, `skipBlankLines`) |
| Cognitive complexity | 15 | `sonarjs/cognitive-complexity` |
| Nesting depth | 4 | `max-depth` |
| Parameters | 4 — object beyond | `max-params` |
| Duplicated blocks | 50 tokens | `jscpd` |

**Function length and cognitive complexity are the ones that matter.** A file is hard to read
because its *functions* are hard to read; keep those small and file length looks after itself.

The one structural rule that *is* enforced is **`import/no-cycle`** — a dependency cycle between
layers is a design defect that compounds, not a style opinion.

### 1.2 Soft budget — per category

Counted as **code lines only**: comments, doc comments, imports and blank lines are **excluded**
(`max-lines` with `skipComments: true, skipBlankLines: true`). Documenting a file can never push
it over budget.

| Category | Budget | Why |
|---|---|---|
| Component (`.tsx`) | 200 | If a component is longer, it is more than one component |
| Hook | 150 | |
| Engine orchestration | 300 | |
| **Engine target compiler** | **600** | Print target compilers are legitimately long and cohesive |
| Types (`*.types.ts`) | 400 | |
| **Data tables** (control codes, glyph maps, locale data) | **unlimited** | This is data, not logic |
| i18n files | unlimited | Data |
| Generated files | exempt | |
| Tests | exempt | |

Exceeding a budget produces a **CI warning, not a failure**, and a comment on the pull request.

### 1.3 Going over — the escape hatch

Some files genuinely should be long. When that is the case, say so **in the file**:

```ts
/** @maxLines 900 — ESC/P/ESC-POS control-code tables; splitting would hide the mapping */
```

CI accepts the annotation and stops warning. The annotation is the point: an exception is
**visible in review and carries a reason**, rather than being silently bypassed or, worse, the
author mangling good code to satisfy an arbitrary number.

CI publishes the list of annotated files each build, so exceptions stay few and stay honest.

### 1.4 The structural answer for long files

Before reaching for the annotation, check whether the length is actually **data wearing a
function's clothes**. This is almost always true of print code:

```
printEngine/
├─ PrintEngine.ts            orchestration                        ~150
├─ targets/EscP.ts           ESC/P compiler — logic only          ~250
├─ targets/EscPos.ts         ESC-POS compiler — logic only        ~250
├─ targets/Html.ts           HTML/PDF compiler                    ~300
└─ codes/                    control-code tables — DATA, unlimited
   ├─ EscPCodes.ts
   ├─ EscPosCodes.ts
   └─ CodePages.ts
```

Extracting the tables leaves short, readable compilers **and** more discoverable data. That is a
better outcome than raising a limit — which is why the budget exists as a prompt to look, not as
a rule to obey blindly.

**Never compress to satisfy a number.** Split by responsibility, extract data, or annotate. In
that order.

---

## 2. Project layout

```
src/
├─ components/     reusable, feature-agnostic. The design system.
├─ engines/        pure logic. No React, no IO, no Tauri.
├─ features/       screens, composed from components + engines.
├─ db/             DataPort contract + adapters.
├─ i18n/           en · ta
└─ constants/
```

**Three layering rules.** Only the third is machine-enforced — the other two are conventions
that review and habit maintain:

1. **`features/` may not define a styled primitive.** If a screen needs a button, a dialog, a
   field or a table, it imports it from `components/`. If the right one does not exist, it is
   added to `components/` — never inlined into the feature.
2. **`engines/` are pure.** No React import, no IO, no Tauri IPC, no `Date.now()` passed
   implicitly — time and randomness are injected. This is what makes them testable in Phase 9
   without being rewritten.
3. **Dependencies point one way:** `features → components → (nothing)` and
   `features → engines → (nothing)`. Components never import features. Engines never import
   either. A cycle is a build failure.

### Folder-per-component

```
components/Button/
├─ index.ts              barrel: export { Button } from './Button';
├─ Button.tsx
├─ Button.types.ts
├─ _styles/
│  └─ Button.module.css  CSS Modules, kebab-case selectors (§5)
├─ __tests__/
│  └─ Button.spec.tsx
└─ _private/             internals never imported from outside this folder
```

`_private/` is enforced by an ESLint import rule. Anything in it is unreachable from elsewhere.
`_styles/` and `__tests__/` follow the same convention — every component/feature folder gets
its own, even single-file ones, including nested folders like `_private/` that have their own
CSS or tests. This applies uniformly across both `components/` and `features/`.

---

## 3. Reusability

> If it is on screen twice, it is a component. If it might be on screen twice, it is a component.

Never rebuilt per feature — always imported:

`AppShell` (folds the nav bar and mobile layout in directly — there is no separate `Sidebar` /
`Topbar` / `MobileNav`, PLAN §13.1's tab bar didn't need them split out) · `Button` (variant prop
covers icon-only and action-bar usage — no separate `IconButton` / `ActionButton` / `ActionBar`) ·
`AppModal` · `AppDrawer` · `AppPopover` · `DataTable` · `SearchableDropdown` · `ContextualHelp` ·
`WeightDisplay` · `CaptureTimeline` · `CameraTile` · `StatusPill` · `EmptyState` · every `Field`
variant.

**Not built yet:** `AppSheet`, `AppConfirmDialog`, `FeedbackStates` (§9 hand-rolls loading/empty/
error/success today — the "nobody hand-rolls them" line below is the target, not the current
state). Add real entries here as they land; PLAN §21 does not currently list any of the three as
scheduled work.

A raw `<button>`, `<input>`, `<table>` or `<dialog>` inside `features/` is a signal that a
component is missing. ESLint flags it as a **warning** with a pointer to the right primitive —
it does not block. Sometimes a one-off genuinely is a one-off; you will know.

Component API conventions:
- Props are a named exported interface in `*.types.ts`.
- Prefer context or a store over prop drilling more than about two levels.
- Variants are a `variant` prop with a union type, not a pile of booleans
  (`primary`/`danger`/`ghost`, not `isPrimary` + `isDanger`).
- Interactive components should accept `disabled`, `loading` and `aria-label`.

---

## 4. TypeScript

**Compiler:** `strict` · `noUncheckedIndexedAccess` · `noImplicitOverride` ·
`exactOptionalPropertyTypes`.

**Errors — these block, because each is a defect:**
- `any` — `no-explicit-any`. Use `unknown` and narrow.
- Floating and misused promises — `no-floating-promises`, `no-misused-promises`. A dropped promise
  in a capture path silently loses a weight.
- `as` casts across unrelated types. Parse with Zod instead.
- Dependency cycles between layers — `import/no-cycle`.

**Conventions — warned, not blocked:**
- Non-null assertion `!` — usually a sign the narrowing is wrong, occasionally justified.
- Default exports, except route/page modules.
- Wildcard imports.
- Business logic inside a component.

**Required:**
- **Zod at every boundary** — IPC, HTTP, file import, database read of a JSON body.
  Parse, never trust.
- **`ts-pattern`** for exhaustive matching over unions. Exhaustiveness is a compile error, so a
  new field kind cannot be silently unhandled.
- Arrow-function exports: `export const compileTemplate = (input: Input): Output => { … }`
- Explicit return types on everything exported.

### Import order

**Applied automatically** by `npm run imports:write` on pre-commit and in CI. You never fix import
order by hand, and it never fails a build. Blank line between groups:

```ts
// 1. external
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { match } from 'ts-pattern';

// 2. aliased internal
import { DataPort } from '@/db/DataPort';
import { Button } from '@/components/Button';

// 3. relative
import { CaptureRow } from './CaptureRow';
import type { TicketViewProps } from './TicketView.types';
```

`import type` for type-only imports, always.

---

## 5. Naming

| Thing | Convention | Example |
|---|---|---|
| Component file & export | `PascalCase` | `WeightDisplay.tsx` |
| Hook | `useThing.ts` | `useOpenTickets.ts` |
| Engine | `camelCaseEngine/` | `formulaEngine/` |
| Variables, functions | `camelCase` | `resolveTemplate` |
| Types, interfaces | `PascalCase` | `TicketCapture` |
| Constants | `SCREAMING_SNAKE` | `MAX_CAMERAS` |
| **JSON config keys** | **`PascalCase`** | `"FieldId"`, `"TemplateName"` |
| **SQL** | **`snake_case`** | `doc_kind`, `created_at` |
| Booleans | `is` / `has` / `can` / `should` | `isStable`, `canCancel` |
| Event handlers | `handle` / `on` | `handleCapture`, `onCapture` |
| CSS Modules class | `kebab-case` | `.form-actions`, `.status-row` |

CSS class selectors are `kebab-case` — the idiomatic CSS spelling — regardless of how they're
accessed in code. `vite.config.ts` sets `css.modules.localsConvention: "camelCaseOnly"`, which
converts each kebab-case selector to a camelCase-only JS export, so `.form-actions` in the
stylesheet is still `styles.formActions` at every call site. **This only works through the
default postcss pipeline** — do not set `css.transformer: "lightningcss"`; Lightning CSS's own
CSS Modules implementation has no case-convention concept and silently exports kebab-case keys
instead, breaking every `styles.xxx` access (`build.cssMinify: "lightningcss"` is fine — that
runs after class names are already resolved).

Domain nouns come from [Terminology.md](Terminology.md) and are used **identically** in code,
database, UI and templates. A ticket is a `Ticket` everywhere — never `slip` in one place and
`record` in another.

---

## 6. Numbers, money and time

Non-negotiable, because this is a trade-measurement product:

- **Weights are integers in kilograms.** Never floats. Display formatting is presentation only.
- **Money and rates are decimal strings** with BigInt-backed arithmetic. **JavaScript floating
  point is banned for any persisted financial value.** Rounding mode is explicit and configured.
- **Timestamps are ISO 8601 with offset**, stored as text. Never a bare local string, never epoch
  milliseconds in the database.
- Formatting for display happens at the edge, never in an engine.

---

## 7. Rust

- `rustfmt` runs automatically. `cargo clippy` **denies only `correctness` and `suspicious`**;
  `pedantic` and `complexity` warn. Same split as TypeScript — bugs block, taste does not.
- **`unwrap()` and `expect()` are errors** outside `main.rs` and tests. Use `thiserror` + `Result`.
  This one blocks: a panic in the capture thread takes the weight with it.
- `unsafe` is permitted **only** in the two Win32 interop modules — raw spooler printing and
  WebView2 print — and every block carries a comment stating the invariant that makes it sound.
- One module per hardware concern. Public items documented with `///`.
- Rust is expected to stay around **15% of the codebase** — a design signal, not a gate. If domain
  logic is creeping into Rust it belongs in an engine, where it also runs on the demo and Android.

---

## 8. Database

- **Additive-only, idempotent, startup-applied schema patches.** No numbered migration chain, no
  destructive DDL — no `DROP`, no `RENAME`, no column removal, ever. Adding is allowed; the point
  is that schema change is never *ordered* or *stateful*, which is what made v1's `update.sql`
  painful. See PLAN.md §6.
- **Every JSON body carries a `BodyVersion`** with an upcaster applied on read. Deferring change
  into JSON does not remove it — it hides it.
- Every JSON column carries `CHECK (json_valid(...))`.
- Indexes are **expression indexes**, registered in `config`, created and dropped at runtime —
  and against a **normalised key** (`$.VehicleNoKey`), because SQLite matches the indexed
  expression literally and will not use an index for a `upper()` or differently-collated variant.
- Prepared statements always. Never string-concatenate SQL.
- **Never `SELECT *` from `asset`** — SQLite materialises the whole row, so reading metadata
  would load every image.
- Keyset pagination — `OFFSET` is avoided on any table that grows.

---

## 9. Errors and state

- Errors are typed and carry a stable `code` plus a **localised** message.
- The UI never shows a raw error string. Every failure has a human sentence, an optional detail
  panel, and a next action.
- **Nothing is silently swallowed.** v1 contained a great many `catch (Exception ignored)` blocks —
  which is how a failed print or a dropped capture becomes invisible. An empty catch is an
  **error**, one of the few style-adjacent rules that blocks, because the failure it hides is
  exactly the kind this product cannot afford. If it is genuinely ignorable, log it with a reason.
- Every async surface handles all four of loading, empty, error and success. Each does today with
  its own inline markup — a shared `FeedbackStates` component (§3) so nobody hand-rolls this is
  the target, not yet built.
- Server state: TanStack Query. UI state: Zustand. Form state: TanStack Form + Zod.
  **Never `useState` for server data.**

---

## 10. Accessibility and localisation

- **No hardcoded user-facing string.** Every label, message, tooltip and help text goes through
  i18n with keys in `en` and `ta`. A literal string in JSX text is a **warning** with
  the key to add — blocking here would make quick UI work miserable, and the missing-key report
  catches anything that slips through before release.
- Full keyboard operation — operators do not use a mouse. Every action has a shortcut, focus is
  visible, tab order follows the layout.
- Minimum contrast 4.5:1. Touch targets at least 44×44px.
- Never colour alone to convey state — pair with icon or text. The stability lamp is the clearest
  example: colour, label and position all say the same thing.

---

## 11. Git

- **Conventional Commits** — `feat:` `fix:` `refactor:` `perf:` `docs:` `chore:` `build:` `ci:`.
  commitlint **warns**; it does not reject a commit. The value is a readable history and generated
  release notes, and neither is worth losing a commit message over.
- Branch names: `feat/capture-timeline`, `fix/tare-expiry`.
- **No build output committed, ever.** No `target/`, no `dist/`, no `node_modules/`, no `.jar`,
  no `.exe`. The previous versions committed a 108MB jar and a 30MB binary — that does not recur.
- **No secrets, ever.** `npm run scan:secrets` runs in CI (§12) — blocking, not advisory; there is
  no pre-commit hook running it yet (§12). Credentials belong in the Windows Credential Manager.
  The previous version committed a live tunnel authtoken in plaintext; this is the rule that
  prevents a repeat.

---

## 12. What CI enforces

Every pull request:

**Blocking — correctness and security only:**

```
typecheck      tsc -b
lint:errors    eslint --quiet          only `error`-severity rules; see §0
clippy         cargo clippy -- -D warnings::correctness -D warnings::suspicious
scan:secrets   no credentials in the tree
build          debug build on windows-latest
```

**Advisory, still runs on every PR/push, `continue-on-error: true` (2026-08-11):**

```
lint:strict    eslint --max-warnings=0  warnings too, not just errors; task #60 got the repo to 0
test:run       vitest run               task #61's unit suite
```

Both are young enough that a false start shouldn't block a merge yet — they report, they just don't
fail the build. Promote either to the blocking list above once it's proven out over more PRs.

**Run locally before committing — not yet automated, so nothing enforces this today but review:**

```
npm run format          prettier --write .
npm run imports:write   import order and grouping (eslint --fix)
cargo fmt                rustfmt, run manually in src-tauri/
```

CI's own format/fmt steps (`format:check`, `cargo fmt -- --check`, §12's advisory table above)
only check — they never write. Wiring a pre-commit hook (Husky or otherwise) to run these `--write`
automatically is unbuilt; until then, "auto-applied" is the target this section describes, not
what happens on every commit.

**Advisory — reported by `npm run size:report`, not yet wired into CI as a PR comment:**

```
size:report  scripts/checkFileBudgets.mjs — per-category file-length budgets (§1.2),
             @maxLines exceptions (§1.3)
```

Function length and cognitive complexity (§1.1) are `eslint` rules (`max-lines-per-function`,
`sonarjs/cognitive-complexity`) reported through the normal `lint`/`lint:strict` output, not a
separate report. There is no `quality:report` script and no dedicated pull-request comment step —
`size:report` and `lint` are what actually run; wiring either into a PR comment is unbuilt.

Rust's `correctness`/`suspicious` split (§0) runs from the `cargo clippy` command line
(`-D clippy::correctness -D clippy::suspicious`, see §12's own table) — there is no `clippy.toml`
in the repo tuning the `pedantic`/`complexity` thresholds mentioned in §1.1's table; those numbers
describe the target, not an enforced file.

**There is no pre-commit hook today** — no Husky, no `simple-git-hooks`, nothing runs on `git
commit`. Format, imports, lint and typecheck all run in CI (§0's table, above) instead. **If a
check cannot tell you something is broken, it does not get to stop you** remains the standard —
enforced by CI's blocking/advisory split, not by a local hook.

---

## 13. Documentation

- Every engine should carry what it does, its inputs and outputs, and its invariants, ideally as a
  `README.md` — none of the 18 engines under `src/engines/` has one yet; individual functions carry
  their own doc comments (next bullet) but there's no per-engine overview file today. Genuinely
  unbuilt, not documented-elsewhere-instead.
- Public functions in engines carry a doc comment explaining **why**, not what.
- Significant decisions are recorded where the code that embodies them lives — a doc comment on
  the module, or a paragraph in [PLAN.md](../PLAN.md) — including what was rejected and why, so a
  decision is never silently relitigated. There is no separate `docs/DecisionLog.md` file; PLAN.md
  §5.1 ("The decision was challenged and stands") is the pattern this follows today.
- Comments explain intent and non-obvious constraints. Never narrate the code.

```ts
// Indicators emit partial frames while the truck settles; a reading is only
// trustworthy once N consecutive frames agree within tolerance.
```

not

```ts
// loop through readings
```
