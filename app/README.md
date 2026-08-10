# BabuScales — application

The build. Planning lives one level up in [`../PLAN.md`](../PLAN.md); the approved interactive mock
is [`../demo/BabuScales-demo.html`](../demo/BabuScales-demo.html).

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
   rejected, a valid one restores real data into a fresh file. `DataPort.exportBackup`/`importBackup`
   sat unwired to any UI until task #40's docs pass surfaced the gap — Settings → System now has a
   real **Backup & restore** card (`features/settings/_private/BackupRestoreCard.tsx`): Save works
   even locked (a plain Blob download), Restore needs the admin password and a confirm step since
   it replaces every ticket, master and setting with the file's contents.
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
    split (`SettingsScreen`). Weighing and System are fully wired against that row (Appearance,
    Connections and Print & printers joined them later — items 18, 21 and 24; Fields & language
    stays a documented placeholder — see Known gap). The top-bar admin chip
    (`AdminChip`) and unlock modal (`AppModal`, newly built — PLAN §10's deferred component,
    built now that a feature needs it) gate every pane's controls, with the mock's own 10-minute
    silent auto-lock. `Rules.TareFirst`/`StrictTare`/`AutoCapture` reach `useWeighingTicket` and
    `WeighingScreen` live ("Applied immediately", per the mock's own card header); the Stability
    gate reaches the simulated indicator's settle physics the same way. Ticket numbering's
    prefix/width reach `formatTicketNo` live, and "Reset the counter now" calls
    `DataPort.resetDocSeries` for real. ✅ Verified: unlock/lock/wrong-password in-browser, a
    live prefix change reflected in the open-ticket strip's ticket number, and auto-capture
    firing a real Tare capture with no button press once enabled.
18. **Operator on duty.** Turns out the mock has no login/accounts at all — `OperatorChip` (a
    top-bar `#opChip`/`#opEdit` port: click to edit inline, blur or Enter commits) and Settings'
    Appearance pane both just set a free-text `OperatorName`, deliberately _not_ admin-gated (the
    mock's own comment: "operator comfort", not configuration). `useWeighingTicket` now stamps
    every capture with it, replacing the hardcoded `DEMO_OPERATOR` constant from Task 14.
    Along the way, found and fixed the same class of bug Task 16's Enter-as-Tab keyboard walk hit
    before: a top-bar inline-edit chip isn't part of any screen's Enter-walk scope, so an
    unmarked Enter inside it got hijacked and force-focused something else instead of committing.
    `useEnterAsTab` now bails out on `[data-enter-skip]`, mirroring the mock's own
    `e.target === $("opEdit")` exclusion. ✅
19. **Real print composition for tickets.** `src/engines/print/` — "one content model, three
    layout engines" (the mock's own description): `buildSlipData` turns live ticket state into a
    flat, formatted `SlipData`; `renderThermalSlip`/`renderMatrixSlip` are pure text generators
    ported from the mock's `ticketTh`/`ticketMx`. A4 is real JSX (`SlipA4`) rather than an HTML
    string — React escapes every field automatically, so there's no `esc()` call to remember, and
    no `dangerouslySetInnerHTML`. `PrintPreviewModal` (a new `size="default"` use of `AppModal`,
    which gained a `size` prop for it) lets the operator switch papers before committing; "Send to
    printer" calls `window.print()` scoped to just the rendered slip via a `#print-slip` id and an
    `@media print` rule, then commits the existing `PrintCount` increment. Deliberately dropped the
    mock's "Verify: babuscales.app/v/…" footer line at the time this item landed — that URL didn't
    resolve to anything yet (no QR verification hosting), and a dead link on an actual printed
    business document would be worse than the mock's own fake demo copy. A later backlog pass
    (`src-tauri/src/net/mod.rs`'s local verification server, `src/engines/verification/`, and
    `src/engines/print/qr.ts`'s real QR rendering) brought a real version of that line back — see
    the Trust and integrations note below. Charge read "—" at the time this item
    landed — item 20 below made it real. ✅ Verified: all three papers render real ticket data
    correctly (weights, timestamps, operator, ticket number, ORIGINAL/DUPLICATE COPY labelling)
    in-browser. `window.print()` itself opens a real, OS-native modal print dialog — by design
    impossible to drive through headless browser automation (the same category of gap as "no real
    Tauri GUI window in this environment" elsewhere in this project's history), so that one click
    wasn't exercised end-to-end here; the composition it prints was.
20. **Real billing.** `src/engines/billing/` — `computeCharge(isComplete)` is the mock's own
    actual runtime formula (`RATE.tareCharge + RATE.grossCharge`, ₹100 + ₹150 flat per completed
    ticket), not the vehicle-type-driven formula its schema field _describes_ but the mock itself
    never evaluates — `null` until both weights are in, mirroring `netKg`'s own null-until-complete
    convention. `formatMoney` (`src/constants/numberFormat.ts`) finally consumes
    `Settings.Formats.AmountDp` (persisted since item 17, unread until now); `asciiMoney` (in
    `renderMonoSlip.ts`) strips the ₹ glyph for thermal/matrix printers, same as the mock's own
    `p.chg.replace("₹ ", "Rs.")`. Charge is now wired end to end: the Weighing "Captured &
    calculated" card's 4th box, Reports' Tickets and Summary columns, Dashboard's "Charge collected
    today" KPI tile, and the real Charge field on all three print layouts. Deliberately does not
    build "Value" (material-rate-based valuation) at this point — that needed Master body-field
    editing UI that didn't exist yet; item 26 built both once it did. Along the way,
    `WeighingScreen.tsx`'s recall-offer logic
    (resume/stored-tare/fill-from-last-ticket) was extracted into `_private/buildRecallOffers.ts`,
    a pure function with no JSX — the screen had grown past this project's 300-line file-split
    convention (`docs/CodingStandards.md`) while this item was being wired in. ✅ Verified
    in-browser: captured a full ticket, confirmed `₹ 250.00` on the Weighing card, in both Reports
    views, on Dashboard's new tile, and on the A4 and thermal print previews (`Rs.250.00` on the
    latter); also confirmed the `buildRecallOffers` extraction still offers a correct "Resume" for
    an open ticket after the refactor.
21. **Real serial-port indicator adapter.** `src-tauri/src/devices/indicator.rs` — the biggest
    remaining zero, closed behind the same `IndicatorSource` interface Weighing has talked to
    since Task 12, so nothing in `WeighingScreen.tsx` changed. A background thread (one `serialport`
    connection at a time, reopened on a settings change without needing an explicit Disconnect —
    Windows won't grant a second handle to a COM port the old thread still holds) reads lines and
    emits a raw weight sample per line as a Tauri event; `parse_weight` turns a line into a number,
    either via a custom regex the operator supplies (PLAN §17's "custom-pattern fallback so any
    indicator works without a code change" — one capture group around the weight) or, with none
    set, by stripping the line to `[0-9+\-.]` and parsing what's left. That fallback is _not_ true
    multi-brand protocol auto-detection (PLAN §17's fuller ask) — it's one general parser plus a
    manual override, which is what one iteration could actually deliver and mean it. The stability
    gate deliberately isn't computed in Rust: `src/engines/indicator/serialIndicator.ts` applies
    `Settings.Stability`'s two knobs (`ReadingsInRow`, `BandKg`) to the raw sample stream itself,
    so a real device and the simulated one mean the same thing by "stable" — reusing the setting,
    not the simulated engine's tick-physics code, which has no equivalent for hardware that sends
    samples at its own cadence. `createIndicatorSource.ts` mirrors `db/createDataPort.ts`'s
    build-time branch exactly (same literal `import.meta.env.VITE_DATA_ADAPTER === "tauri"` check,
    same reason), and the type-level surface that discriminates the two adapters
    (`isSerialIndicatorSource`, in `types.ts`) is kept Tauri-import-free and out of any code path
    the memory build could pull in unintentionally. Settings' Connections pane (previously a
    placeholder) is PLAN §17's setup wizard scoped down to one iteration: port + baud + optional
    pattern, "Applied immediately" like the Weighing pane's Stability gate — not the full
    "watch raw bytes live, confirm" wizard, which needs real hardware in hand to build against and
    isn't (see Known gap). ✅ Verified: `cargo build`/`clippy -D warnings`/`fmt --check` clean; a
    throwaway `cargo run --example` (deleted once it passed, same precedent as the store's own
    Rust↔TS check) exercised `parse_weight` against ten cases — bare weights, a unit suffix, a
    negative, empty/non-numeric input, a real custom-pattern frame, and the checksum-line case the
    pattern exists for — all ten passed. Typecheck/lint/format clean; the memory build's
    tree-shaking guarantee re-verified (`grep` for `TAURI_INTERNALS`, `tauri-apps`, and the new
    command names in `dist/assets/*.js` finds nothing); the Tauri build's bundle confirmed to
    contain them. In-browser: the Connections pane's "desktop app only" fallback renders correctly
    on the memory/Pages build, and a full send-a-lorry → capture Tare regression confirmed the
    simulated indicator is completely unaffected by `StabilityGateSync`'s move from a
    simulated-only type to a duck-typed check. What's **not** verified — genuinely can't be, in
    this environment — is a real connection to real hardware; see Known gap.
22. **Bulk report print.** `src/features/reports/reportPrintRows.ts` + `src/engines/print/` —
    the mock's `btnRPrint` (real) alongside its Export PDF/Excel/CSV buttons (dead: no `id`, no
    click handler at all in `demo/BabuScales-demo.html` — not a corner this app cut, the reference
    spec's own buttons don't do anything either). Ported `reportA4`/`reportMx`/`reportTh` faithfully:
    `reportPrintRows.ts` reduces `TicketRow[]`/`SummaryRow[]` to the mock's own narrower,
    print-specific column set (Ticket/Vehicle/Party/Net kg for the register — no Charge column,
    unlike the Summary print's Group/Tkts/Net t/Charge; an inconsistency in the mock, kept rather
    than "fixed", since the mock wins on behaviour — PLAN §22). `engines/print/buildReportSlipData.ts`
    computes `DateRange` from the real earliest–latest timestamp of the printed rows rather than
    the mock's `rFrom`/`rTo` inputs, which this app has no date-range filter to drive yet (see
    Known gap) — a real, data-derived value standing in for one the underlying feature to produce
    doesn't exist. `pad.ts` (rpad/lpad) extracted out of `renderMonoSlip.ts` so the new
    `renderReportMonoSlip.ts` doesn't duplicate it. `ReportA4.tsx`/`ReportPrintModal.tsx`
    (`features/reports/_private/`) mirror `SlipA4.tsx`/`PrintPreviewModal.tsx`'s structure —
    same `#print-slip` scoped-print trick, same three-paper `SegmentedControl` — for both the
    Tickets and Summary views. ✅ Verified in-browser: captured a ticket, opened Reports, and
    confirmed all three papers render real data for both views (six renders total) — including the
    real computed date range on A4 and the correct column-dropping on Thermal/Matrix.
23. **Cameras — the mock's own fixture, ported faithfully.** `src/features/cameras/` — turns out
    the reference spec's Cameras tab has no real video anywhere either: `CAMS` is a fixed 4-slot
    array (Front/Rear/Plate/Driver), `renderCams` never touches `getUserMedia`/RTSP/ONVIF, every
    tile is decorative text laid over a striped placeholder background, driven entirely by the
    current ticket's own state (the typed vehicle number, the last capture's mark). Porting PLAN
    §16 for real — actual USB/IP capture, overlay burn-in on a real frame, retention, ANPR — would
    be building past what even the mock demonstrates; that stays a documented gap. What's real
    here: `cameraFixtures.ts` (`CAMERA_SLOTS`, verbatim from the mock's `CAMS`), `CameraTile.tsx` +
    `CameraGrid.tsx` (one component, two layouts — `variant="sidebar"`/`"page"` — shared by both
    surfaces exactly as the mock's own `camGrid`/`camSide` render identical markup), and
    `cameraBurnIn.ts` (ports `renderCams`'s own mark string:
    `` `${ticketNo} · ${weight} kg · ${time}` ``). `CamerasScreen` replaces the tab's old
    "— Phase 2" placeholder; `WeighingScreen` gained the mock's `camCard` sidebar card, which it
    never had before this item (a real gap against the reference spec, not a deliberate omission).
    ✅ Verified in-browser: typed a vehicle number and watched Front/Plate update live in both the
    Weighing sidebar and the full tab; captured a Tare and watched the burn-in mark
    (`Draft · 12,376 kg · 7:09:52 AM`) appear identically in both places, confirming the shared
    `CameraGrid` behaves the same at both sizes.
24. **Settings — Print & printers, the Printers half.** `src/features/settings/_private/PrintPane.tsx`
    replaces that pane's placeholder with the mock's own `PRINTERS` fixture (`settingsSchema.ts`'s
    `PRINTER_FIXTURES`) and a real `Printers: {A4, Mx, Th}` config row, wired the same
    save-on-change, "Applied immediately" way as Connections (item 21). Deliberately not a live
    driver binding — `window.print()` (both per-ticket and bulk-report slips) always opens the real
    OS print dialog, where the operator picks the actual target printer; neither this app nor the
    mock can select one silently, so this is a stated preference, exactly like the mock's own
    `cfg.prn`. The mock's other card on this pane — a three-step "New template" wizard for
    uploading custom HTML layouts — was deliberately not ported: PLAN §21's own roadmap table names
    the visual template designer as a Phase 8 item, "designed for, not built," so it's out of scope
    even though the mock itself demonstrates it. That card stays a documented note instead (see
    Known gap's "Print templates"). ✅ Verified in-browser: unlocked admin, changed the A4 default
    from HP LaserJet M1005 to Canon LBP2900B, switched panes and back, and confirmed the new value
    round-tripped through `db.saveConfig`/`SettingsProvider` rather than just sitting in local DOM
    state.
25. **Settings — Integrations, the Connections pane's second card.**
    `src/features/settings/_private/ConnectionsPane.tsx`'s new `IntegrationsCard` — turns out this
    one bit of the mock's Settings screen isn't decorative like Export or the template wizard:
    `renderInts` really does flip `x.on` and re-render on click, so it earned a real, persisted
    `Integrations: {whatsapp, sms, email, backup, webhook, qr, tally, board}` config row
    (`INTEGRATION_FIXTURES`, ported verbatim from the mock's own `INTEGRATIONS` array, including
    its exact default on/off flags) rather than a placeholder note. "Configure" stays decorative on
    both sides — the mock's own version never opens a real per-channel form (SMTP host, API token,
    ...), just flashes `"<name> · <cfg> — stored in the settings table"`, ported unchanged. Reused
    the mock's own `.tpl`/`.badge` row styling (nothing else in this codebase had built it yet — the
    deferred template-list card would have been the other user). ✅ Verified in-browser: unlocked
    admin, turned WhatsApp off (badge disappeared, header flashed "WhatsApp disabled", button
    relabelled "Turn on"), clicked WhatsApp's Configure and confirmed the exact flash text
    (E-mail's own Configure later gained real behaviour of its own — see item 29).
26. **Real "Value" — Material.Rate, and the formula breakdown that shows it.** The mock's own live
    calc (`recalculate()`: `value: net != null && mat ? Math.round(net / 1000 * mat.rate) : null`)
    turned out to be real too, same discovery as item 25's Integrations — it just isn't a fifth box
    in the `.calc` grid, it lives in a `#formula` derivation paragraph underneath (`renderCalc()`),
    ported here for the first time as `_private/CalcFormula.tsx`. Needed a real field to read:
    Material master rows were Name/Notes only, so `MastersScreen.tsx` grew a Rate/t field and
    table column for that one kind (`db/materialBody.ts`'s `getMaterialRate`), matching the mock's
    own read-only `mTblMat` header exactly. `engines/billing/value.ts`'s `computeValue` is
    hand-computed, not run through `engines/formulaEngine` on the schema's aspirational
    `"Round(Net / 1000 * Material.Rate, 0)"` string — same precedent `computeCharge` already set
    one file over, for the same reason: the mock's own runtime never interprets that formula
    either. The Value line only appears once a Material with a real Rate is selected; most demo
    tickets still show just Net and Charge, exactly like the mock. ✅ Verified in-browser: gave
    M-Sand a ₹1,250/t rate in Masters, captured a real Tare (12,370 kg) and Gross (33,757 kg) on a
    ticket with M-Sand selected, and confirmed all three derivation lines rendered correctly —
    including `21.387 × ₹1,250 = ₹26,734.00`, the correct rounded result.
27. **Split `WeighingScreen.tsx` back under the 300-line budget.** Grown to 500 lines across items
    19–26's own additions (the Charge box, the Cameras sidebar card, Value's formula breakdown) —
    tracked as its own task rather than fixed inline each time, so feature work didn't keep
    stalling on a refactor. Three self-contained pieces came out: `_private/TicketFieldsCard.tsx`
    (the four SearchableDropdown fields + Challan No + the recall banner), `_private/CalcCard.tsx`
    (the "Captured & calculated" card — item 26's own note called this "the cleanest candidate",
    and it stayed that way: only `weights`/`captures`/`charge`/`materialRate`/`value`/`amountDp`,
    no cache or DataPort deps), and `_private/ActionsCard.tsx` (the button stack + status hint).
    `WeighingScreen.tsx` itself is 218 lines now — state, effects and the four cards' wiring, same
    shape as `buildRecallOffers.ts`'s extraction one item back, just three cards' worth instead of
    one function. ✅ Verified: pure refactor, no behaviour change — typecheck/lint/format clean (no
    new warnings beyond the already-established per-file 60-line function threshold, which nearly
    every screen in this codebase already carries), both builds succeed, tree-shake grep still
    passes, and in-browser: captured a real Tare through the split screen and confirmed every card
    (Ticket fields, calc grid, Actions, Cameras) still renders and updates exactly as before.
28. **Real language-pack upload — the other half of "Fields & language."** Turned out this was
    already scoped for, just never wired up: `i18n/schemas.ts`'s `languagePackSchema` and
    `I18nProvider`'s own doc comment ("loading is the caller's job") were sitting there since item
    5, unused, while `App.tsx` passed a hardcoded `[DEMO_TAMIL_PACK]` prop. Now `i18n/loadLanguagePacks.ts`
    loads every `config` row (`ConfigKind: "LanguagePack"`) at startup — seeding `DEMO_TAMIL_PACK`
    as a real row on a fresh install, same "create the default row on first run" shape
    `SettingsProvider` already uses — and `_private/FieldsLanguagePane.tsx` (Settings' Fields &
    language pane) ports the mock's own real `wireDrop("dropLang", ...)`: pick a `.json`, parse,
    validate against `languagePackSchema`, save, apply immediately. Matches the mock's own
    installed-packs table (Code/Language/Strings/Version). The top-bar language chip — this app's
    own addition, not in the mock, which puts its language picker in the Appearance pane instead —
    is generalized from a hardcoded en/ta toggle to show whichever pack is actually installed,
    keeping the "one extra language ships at a time" scope `I18nProvider`'s own comment states.
    "Field schema" (the pane's other card — a schema.json drop zone that would edit field
    labels/required-ness) stays a placeholder; that needs schema-driven field rendering, a
    separate and much larger feature (see Known gap). Deleted the now-fully-unused
    `PlaceholderPane.tsx` (its only two callers were this pane and Print & printers — item 24
    replaced the second one). ✅ Verified in-browser: fresh load seeded and showed தமிழ் as the
    toggle target; clicking it live-switched nav labels to Tamil; uploaded a real two-string French
    pack via a dispatched `change` event on the file input and confirmed the flash message
    ("Applied · Français · 2 strings"), the installed-packs table gaining a row, and — separately —
    a malformed-JSON upload producing the correct "Not valid JSON" error flash rather than a crash.
29. **Real Email/SMTP ticket delivery.** The first of Integrations' eight rows to move past a
    persisted toggle with nothing behind it (item 25's own note). `src-tauri/src/net/email.rs` —
    `lettre` over STARTTLS (`rustls-tls`, no system OpenSSL dependency, same reasoning as
    `rusqlite`'s bundled SQLite) — sends one message per call; the SMTP password is a secret
    (`security::set_secret`, same Windows Credential Manager store as the tunnel connector token),
    host/port/username are an ordinary `Smtp` config row. `src/engines/email/` mirrors
    `engines/licensing`'s shape, not `engines/tunnel`'s: a plain Tauri-vs-noop wrapper with no
    Context/Provider, since a send is one stateless round trip, not a connection with live status
    to poll. Settings → Connections gained a real **E-mail delivery** card (host/port/username/
    password fields, a "Send test e-mail" button) — the Integrations row's own "Configure" now
    points there instead of flashing the generic stub. Party masters gained a real `Email` field
    (`MastersScreen.tsx` — form field and table column, Parties only); `WeighingScreen`'s print flow
    looks the ticket's party up by name, and when Integrations → E-mail is on and that party has an
    address on file, enqueues a `Channel: "Email"` outbox row and attempts the send immediately,
    reconciling it to `Sent`/`Failed` right away — a "drain of one" rather than the background
    worker every Integrations channel still needs (see Known gap), same scope call as the QR
    verification job before it. ✅ Verified: `cargo check`/`clippy -D warnings`/`fmt --check` clean;
    typecheck/lint/build clean; in-browser (memory adapter) confirmed the E-mail delivery card
    saves host/port/username/password and round-trips them, "Send test" honestly reports "desktop
    app only, not available in this build" (the noop source), and a new Party master saves and
    displays a real e-mail address in its own table column. Actually sending mail needs a real SMTP
    relay and the desktop build to test against, neither available in this environment — not
    exercised end-to-end past the Rust compiling and the noop path's honest fallback, the same
    category of gap as the serial indicator and `window.print()` before it.
30. **Real SMS delivery via serial GSM modem.** The second of Integrations' eight rows to move past
    a persisted toggle, same scope call as item 29's e-mail. `src-tauri/src/net/sms.rs` — plain
    AT commands (`AT+CMGF=1` text mode, `AT+CMGS="<number>"`, message body terminated with a lone
    Ctrl+Z) over the same `serialport` crate `devices::indicator.rs` already depends on; no new
    Cargo dependency needed. Unlike the indicator's continuously-open connection, a send opens the
    port, walks the handshake, and closes it again — one blocking round trip per call, the same
    "no `AppState` connection" shape as item 29's `net::email::send`. No secret to store here: AT
    commands over a local serial port need no auth, so `src/engines/sms/` is smaller than
    `engines/email` (no password methods), otherwise the same plain Tauri-vs-noop wrapper shape,
    plus a `listPorts()` reusing `commands::indicator::list_serial_ports` (already a generic,
    device-agnostic command — no new Rust command needed for that piece). Settings → Connections
    gained a real **SMS delivery** card (serial port/baud select reusing `BAUD_RATE_OPTIONS`, a
    "Send test SMS" button) — the Integrations row's own "Configure" now points there instead of
    flashing the generic stub, and its decorative label was corrected from "Sender ID · API key"
    (implying a cloud gateway) to "GSM modem · serial port" (what this build actually talks to).
    Party masters gained a real `Phone` field, mirroring item 29's `Email` field exactly (form field,
    table column, Parties only — `MastersScreen.tsx` already carried a forward-looking comment
    anticipating this from item 29). `WeighingScreen`'s print flow looks the ticket's party up by
    name, and when Integrations → SMS gateway is on and that party has a phone number on file,
    enqueues a `Channel: "Sms"` outbox row and attempts the send immediately, reconciling it to
    `Sent`/`Failed` right away — the same "drain of one" as e-mail, not the background worker every
    Integrations channel still needs (see Known gap). ✅ Verified: `cargo check`/
    `clippy --all-targets -- -D warnings`/`fmt --check` clean; typecheck/lint/build clean; in-browser
    (memory adapter) confirmed the SMS delivery card saves port/baud and round-trips them, "Send
    test" honestly reports "desktop app only, not available in this build" (the noop source), and a
    new Party master saves and displays a real phone number in its own table column. Actually
    sending a text needs a real GSM modem and the desktop build to test against, neither available
    in this environment — not exercised end-to-end past the Rust compiling and the noop path's
    honest fallback, the same category of gap as item 29's SMTP relay.
31. **Leave WhatsApp decorative — by decision, not oversight.** Unlike items 29 and 30, this one
    shipped no code: it's the record of *why* Integrations' `whatsapp` row is the one toggle that
    will never get item 29/30's treatment. WhatsApp only has two paths in, and neither belongs in a
    product sold to sites: Meta's official Cloud API needs a paid, Meta-approved business account
    and a per-message cost — the exact thing PLAN §23 open question 5 flagged as "the only
    per-message cost" once item 30 sidestepped it for SMS via a bring-your-own serial modem — and
    WhatsApp has no serial/AT-command equivalent to sidestep it with, being a proprietary
    end-to-end-encrypted app protocol rather than a modem on a COM port. The other path, unofficial
    libraries that impersonate a WhatsApp Web session (Baileys, whatsapp-web.js), is free but
    violates WhatsApp's own Terms of Service and risks the site's number getting banned. The
    reasoning now lives in three places so it survives independently of any one of them: a comment
    directly above `INTEGRATION_FIXTURES`'s `whatsapp` entry in `settingsSchema.ts`, `AdminSetup.md`
    §8, and this item. ✅ Nothing to verify — no runtime behaviour changed; the toggle persists and
    "Configure" flashes the same decorative stub it always has (see item 25).
32. **Scheduled daily summary.** PLAN §18's own "scheduled daily summary" bullet — a real, if
    minimal, scheduler: `App.tsx`'s new `DailySummarySync` (same `*Sync` shape as
    `SerialConnectionSync`/`VerificationServerSync` just above it) checks once a minute whether
    Settings → System → Scheduled daily summary is on, today's chosen time has passed, and today's
    date isn't already `DailySummary.LastSentDate` — and if all three hold, builds and sends one
    e-mail over the exact SMTP path item 29 already built (`@engines/email`), then advances
    `LastSentDate` whether the send succeeded or not (one attempt, no retry queue, the same honesty
    item 29/30 already established for per-ticket delivery — a permanently misconfigured relay fails
    once a day here, not once a minute). No background service exists in this app or ever will
    without a genuine OS-level daemon (known gap, below) — this scheduler is entirely inside the
    running React app, so a machine that's off or asleep at the scheduled time sends nothing until
    it's next opened, stated plainly in both the card's own hint text and `AdminSetup.md`.
    `reports/dailySummaryEmail.ts`'s `buildDailySummaryEmail` composes the message body from the
    same `reportRows.ts` data the Reports screen itself totals — the three Dashboard KPIs (tickets,
    net tonnes, charge collected) plus a by-material breakdown — as plain text, not a PDF/Excel
    attachment (no export engine exists yet, same known gap Reports' own disabled Export buttons
    already document). Deliberately not reimplemented against `dashboardData.ts`'s own
    `computeDashboardKpis` — importing across features/dashboard would have closed a
    reports↔dashboard cycle (`dashboardData.ts` already imports `TicketRow` from `@features/reports`)
    — so this is a small, independent second computation of the same three numbers, not a shared
    one. `settingsSchema.ts` gained a `DailySummary` config block (`Enabled`, `Time`, `Recipient`,
    `LastSentDate`); `LastSentDate` is bookkeeping, not admin configuration, so it writes through a
    new `recordDailySummarySent` context method that — like `setOperatorName` before it —
    deliberately isn't gated by `unlocked`: the scheduler can fire while Settings sits locked, same
    as any other automatic behaviour in this app. Settings → System gained a **Scheduled daily
    summary** card (`SystemPane.tsx`) with the enable toggle, time picker and recipient field
    (all admin-gated, `save`), and a **Send now** button that runs the exact same build-and-send path
    on demand — both the fastest way to confirm the relay and recipient are right, and a real manual
    trigger in its own right. ✅ Verified: typecheck/lint/build clean; in-browser (memory adapter)
    confirmed the card renders under System, "Send now" stayed disabled with an empty recipient,
    and with one filled in it enqueued a `Channel: "Email"` outbox row, honestly reported
    `"Send failed — e-mail delivery — desktop app only, not available in this build"` (the noop
    source, same as item 29/30's own test-send verification), and still advanced `LastSentDate` to
    today — confirmed by the card's own "Last sent: …" hint updating immediately after. Actually
    sending needs a real SMTP relay and the desktop build, neither available in this environment —
    the same category of gap item 29's own verification note already names.
33. **Multi-gross weighing.** PLAN §7.1 (line 429) tags this "(future)" with one line of spec —
    `[Tare, Gross1, Gross2, Gross3…]`, "net computed per gross" — and the reference mock never built
    it (no multi-gross code anywhere in `demo/BabuScales-demo.html`), so this shipped with no prior
    art to port. Off by default (`Rules.MultiGross`, new fourth entry alongside the mock's own three
    surviving rules — `settingsSchema.ts`) — with it off, every code path below behaves exactly as it
    did before this item; the field only widens what's already allowed, never narrows it.
    `db/ticketBody.ts`'s `defaultCaptureKind` is the one place that decides whether a Tare+Gross pair
    is final: with `MultiGross` on it keeps re-offering "Gross" instead of returning `null`, and
    `deriveWeights` sums every Gross capture's own weight for `grossKg`, and every Gross capture's own
    net against the single Tare for `netKg` — deliberately NOT `grossKg - tareKg`, which is only true
    for the single-gross case (a real bug this item found and fixed along the way: `StatusPill` was
    independently recomputing `Math.abs(gross - tare)` instead of accepting the ticket's already-
    correct `netKg`, so a second Gross capture made its pill disagree with the calc card next to it —
    fixed by giving `StatusPill` an optional `netKg` prop that overrides the fallback). `CalcFormula`
    shows the honest sum-of-per-load-nets line once there's more than one Gross, instead of silently
    keeping the single-subtraction line that would otherwise show a false equation. `useWeighingTicket`
    threads the same `multiGross` flag as `tareFirst`/`operatorName` (read fresh, not captured once);
    `pushCapture`'s guard is the only other change — a repeat "Gross" is the one case `hasCapture`
    must not block. `save()`'s own lock trigger (`captures.length >= 2`) is untouched: it's still the
    only thing that finishes and locks a ticket, whether that's the original single pair or however
    many Gross captures the operator took before clicking Save — there's no separate "add another
    load" action to learn, the operator just keeps capturing until they're done. Settings → Weighing
    gained the toggle; `ActionsCard`'s "Capture as" control keeps Gross selectable after the first one
    when the flag is on, "Send a lorry" and the capture button rely on `!ticket.kind` alone rather
    than a hardcoded capture count, and the status hint spells out "capture another Gross, or Save to
    finish" once a pair already exists. ✅ Verified: typecheck/lint/build clean; in-browser (memory
    adapter) captured Tare + two Gross loads with the rule on — calc card, formula breakdown,
    StatusPill and the printed slip all agreed on the same aggregate Net — then confirmed the rule off
    reproduces the exact original single-pair flow (segmented control disables Gross after one
    capture, "Both weights captured" caption, single-subtraction formula line, no "N loads" stamp).
34. **Legacy v1/v2 data import tool.** PLAN §22 Phase 7 asks for a way to move a site off the older
    desktop products PLAN calls v1/v2 (VaultBill) onto BabuScales. No v1/v2 source tree or database
    schema exists in this repo to build a native reader against, so rather than fake a `.mdb`/`.db`
    parser this shipped a documented, versioned JSON interchange format instead —
    `src/engines/importEngine/legacyImportBundle.ts` (a zod schema, `LegacyImportBundle`,
    `BundleVersion: 1`) that a site converts its outgoing data into, by hand for a small site or with
    a short script for a large one — the honest tradeoff, not an oversight (see the file's own header
    comment). One JSON bundle, not nine separate CSV importers: Masters bulk import/export at real
    scale is already its own tracked gap (`MastersScreen.tsx`'s own comment), and building ad-hoc CSV
    parsing here would have duplicated that future work. `legacyImportPlan.ts` is pure planning logic
    — no `DataPort`, no IO, matching every other engine (PLAN §11) — `planLegacyImport(bundle,
    existing)` turns a parsed bundle plus a snapshot of what's already here into a plan of
    master/ticket drafts and per-row skip reasons; the IO-driving half
    (`src/features/settings/_private/legacyImportRun.ts`) reads that snapshot via
    `listMasters`/`listDocs` and applies the plan one `saveMaster`/`saveDoc` call at a time in a
    sequential loop (not `Promise.all`), so a failure partway through leaves a clean, countable
    boundary instead of an unordered pile of settled/rejected promises. Idempotent on both sides:
    masters dedupe by normalized (trimmed, lowercased) name against a fresh read — "good enough at
    migration-time scale," a documented limitation, not a general merge tool — while tickets carry a
    required `LegacyId` that's stashed into the new ticket's own body as `ImportRef` (via
    `TicketBody`'s existing `.passthrough()` parse) and checked against every existing ticket's own
    `ImportRef` on re-run, so importing the same file twice — or two overlapping files — never
    double-creates anything. `LegacyImportCard.tsx` (`src/features/settings/_private/`) previewing a
    chosen file works with Settings locked (read-only, safe); committing needs the admin password
    unlocked, the same asymmetry `BackupRestoreCard`'s own save-vs-restore split already established.
    Committing an import triggers `db.exportBackup()` and downloads a `.bak` restore point first
    (reusing `BackupRestoreCard`'s exact download-Blob pattern, now exported as
    `timestampForFilename`) before any write happens — PLAN §14's "never exist without a way out"
    rule applies here too. ✅ Verified: typecheck/lint/build clean; in-browser (memory adapter) happy-
    path import across five master kinds plus a ticket landed correctly in Masters and Reports with
    correct computed Net/Charge; re-importing the same file skipped all rows with accurate per-row
    reasons; malformed JSON and zod-schema-validation errors (bad `BundleVersion`, missing
    `LegacyId`) both surfaced clearly; preview-while-locked vs. commit-needs-unlock gating confirmed.
35. **Settings: real Field schema pane.** PLAN §8/§8.3's field-definition-driven schema system
    (`src/engines/schemaEngine/` — `Schema`, `Field` union, `DEFAULT_TICKET_SCHEMA`) existed since
    item 9 but was pure and dormant: nothing loaded it from or saved it to `DataPort`, and its only
    reader (`TicketFieldsCard.tsx`) read the hardcoded constant directly, always in English,
    ignoring whichever language was active — a real, if minor, existing bug. This wires the engine
    up for real, mirroring item 32's language-pack precedent field-for-field: `Schema extends
    JsonRecord` the same reason `LanguagePack` does (`schemaEngine/types.ts`); an uploaded schema
    `.json` is untrusted the moment it leaves the file picker, so `schemaEngine/schemaJson.ts`
    hand-mirrors every `Field` variant via a zod discriminated union (`ticketSchemaSchema`,
    `parseTicketSchema`) — documented as needing manual sync with `types.ts`, the same tradeoff
    `legacyImportBundle.ts` already made; `db/schema.ts` holds the IO half (`loadTicketSchema`/
    `saveTicketSchema`), keyed by a fixed `ConfigId: "schema-Ticket"` (one *active* schema per
    DocKind, not a history) using the already-reserved `ConfigKind: "Schema"` (`db/types.ts`'s
    `CONFIG_KINDS`, unused until now); and `App.tsx` owns the loaded state plus a save-and-update
    callback, same split as `packs`/`addLanguagePack`. Unlike language packs, the schema is reached
    via a real `SchemaProvider`/`useSchema()` context (`engines/schemaEngine/`, following the
    `engines/tunnel/` precedent for a Provider living inside an engine folder) rather than threaded
    down as a prop through four component layers — `FieldsLanguagePane.tsx` and
    `TicketFieldsCard.tsx` both call `useSchema()` directly. The scope is deliberately narrow, not
    the full theoretical feature: the schema is genuinely persisted and admin-editable, and its
    `Label`s genuinely drive Weighing's five existing built-in fields live, correctly resolved
    through whichever language is active (`resolveLocalized`, fixing the `.en`-only bug) — but
    schema-driven field *rendering* (auto-generating inputs for a custom `FieldId`, evaluating
    `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen`/`Validate` formulas against the ticket form) is a
    separate, much larger feature this app still doesn't have; a schema introducing new FieldIds
    validates and saves but its extra fields stay inert. `FieldsLanguagePane.tsx`'s Field schema
    card shows the live schema in a table (Field/Kind/Label/Indexed), an `unlocked`-gated upload
    (mirroring the language-pack drop zone exactly) and a Reset-to-default action. ✅ Verified:
    typecheck/lint/build clean; in-browser (dev server, memory adapter) confirmed the default
    schema loads and renders on both the Settings table and Weighing's field labels; uploading a
    relabeled schema updated both live, including a Tamil `Label` resolving correctly after
    switching the language toggle (proving the `.en`-only bug is actually fixed, not just
    reworded); malformed JSON was rejected with a clear message and left the prior schema intact;
    Reset to default restored the built-in labels; the upload control and Reset button are both
    gated behind Settings being unlocked.

## Known gap

**Real serial-port indicator adapter, but not the full PLAN §17 wizard** — item 21 above built the
adapter, the pure parser, and a scoped-down Connections pane; not built: the "watch raw bytes
live, confirm" wizard steps, true multi-brand protocol auto-detection (one general fallback parser
plus a manual regex override stands in for it), and everything past the indicator in PLAN §17's
hardware list (LED display output, boom barrier/traffic light relays, presence sensor, TTS
announcements, RFID/barcode — SMS via serial GSM modem is no longer in this list, see item 30).
None of it has been run against a real
indicator — no hardware exists in this environment to test against; only the parser (a throwaway
example) and the port-listing/connect/disconnect plumbing (`cargo build`/`clippy`, code inspection)
have been verified, the same category of gap as "no real Tauri GUI window in this environment"
elsewhere in this project's history.

**Not built at all yet:** real camera capture (item 23 built the mock's own decorative fixture, not
PLAN §16's actual USB/IP/RTSP/ONVIF capture, overlay-stamped frames, retention, or ANPR — ANPR is
deferred by decision regardless, PLAN §21 Phase 8). Operator identity (item 18) is a name, not an
account — anyone can change it, there's no password. A real per-operator login, if ever wanted, is
a different and bigger feature the mock itself never specifies, so nothing here invents one.

**Built, but deliberately smaller than the PLAN §9.1/§18 spec:**

- **Masters** — client-side substring search over a per-kind cache, not FTS5; a plain table, not
  virtualised/keyset-paginated; no merge-duplicates or bulk import/export. Fine at demo/site scale,
  not at 100,000 rows.
- **Master field richness** — generic Name/Notes only, except StoredTare, Material (item 26's Rate
  field), and now Party (item 29's Email field, item 30's Phone field). No GST fields on Party — the
  mock never defines
  one either (its static `PARTIES`
  fixture carries no GST data, only the invoice header's own hardcoded GSTIN string); no
  Vehicle↔VehicleType linkage — the mock's `VEHICLES` fixture has a `ty` string per row, but it's
  never a real foreign key into a `VehicleType` master, just display text.
- **Recall** (PLAN §9.2) — a simplified, statically-positioned inline banner (`RecallBanner`), not
  the mock's viewport-positioned popover.
- **Reports has no date-range filter** — the mock's `rFrom`/`rTo` inputs weren't ported; both
  views always show every ticket. Item 22's bulk print substitutes a real, data-derived date range
  (the printed rows' own earliest–latest timestamp) rather than fabricating one.
- **Settings** — Weighing, System, Connections and Print & printers are fully wired (items 17, 21,
  24); Appearance is partly wired (Operator-on-duty is real, Theme is a placeholder — item 18);
  Fields & language is now fully wired (item 28: Language packs; item 35: Field schema — labels and
  reordering/indexing are real and persisted, though see "Schema-driven rendering" below for what's
  still not built). Within System, ticket numbering is live and `Formats.AmountDp` now reaches
  every money display (item 20); date/time formats are still only persisted, unread elsewhere. The
  stale-tare threshold (`STORED_TARE_STALE_AFTER_DAYS` in `src/db/storedTare.ts`) stays a fixed
  constant — the mock itself never exposes it as a setting either (`ex:"expired"` is static demo
  master data, not computed from a configurable day count).
- **Schema-driven rendering** — item 35 made the schema itself real, persisted, and admin-editable
  (Settings → Fields & language's "Field schema" card), and Weighing's five built-in fields now
  read their `Label`s from that live, saved `Schema` row rather than a hardcoded constant. What's
  still not built: Weighing does not render fields *generically* from schema config — a custom
  `FieldId` in an uploaded schema validates and saves but adds no input to the form, and
  `VisibleWhen`/`RequiredWhen`/`ReadOnlyWhen`/`Validate` formulas are never evaluated against the
  ticket. That remains a separate, much larger feature.
- **Billing** — Charge is real (item 20: `engines/billing`, wired into Weighing, Reports,
  Dashboard, and the print slip), but flat and hardcoded (`TARE_CHARGE_INR` + `GROSS_CHARGE_INR`),
  matching the mock's own actual runtime behaviour rather than its schema's aspirational
  vehicle-type formula. Item 26 built Value (`computeValue`, Material.Rate-based) alongside it,
  but only on Weighing's own formula breakdown — checked the mock itself before assuming this was
  a gap: `p.value`/`c.value` never appears in any of its ticket-slip templates, report functions,
  or dashboard KPIs either, only in `renderCalc()`'s `#formula` text. Value not reaching Reports,
  Dashboard or the print slip therefore isn't an omission, it matches the reference spec's own
  scope exactly. No Settings-driven way to change the flat Charge rate exists either.
- **Export** — Reports' Export PDF/Excel/CSV buttons are shown disabled rather than silently doing
  nothing, matching the mock's own dead buttons for the same three actions (no `id`, no click
  handler at all — see item 22). Both bulk print (item 22, the ticket register/summary) and
  per-ticket print (item 19) are real; only PDF/Excel/CSV file export has nothing to port from the
  reference spec.
- **Print templates** — the mock's three-step template wizard (upload custom HTML with
  `{{Placeholders}}`, multiple named templates per paper size) wasn't ported: PLAN §21's roadmap
  table names the visual template designer as a Phase 8 item, deferred by decision, "designed for,
  not built" — so building it would be scope creep past this app's own "keep going until phase 8"
  boundary, not just past the mock's decorative features. Item 19 built the three built-in layouts
  (A4/thermal/dot-matrix); item 24 built per-kind default-printer selection (a config row, not a
  driver binding); the editor around custom layouts is what stays undone.
- **Multi-gross** (item 33, PLAN §7.1's "(future)" tag) — the calc card and formula breakdown show
  the honest per-load sum, but the printed slip (`buildSlipData.ts`) has one Gross line, same as
  before this item: a multi-gross ticket's slip shows the aggregate Gross/Net only, with the last
  Gross capture's own timestamp, not an itemised line per load. There's also no way to park a
  multi-gross ticket mid-sequence — `save()` still only ever finishes and locks a ticket (unchanged
  from before this item), so all of a ticket's loads need capturing in one continuous session before
  Save; a browser refresh or app restart before that loses whatever wasn't saved yet, the same risk
  an un-parked Tare-only ticket already carries today.
- **`CaptureTimeline`** (named in PLAN's architecture list) was not built — Weighing's "Captured &
  calculated" card uses the mock's `.calc` three-box grid instead.
- **Dashboard's hourly window** (06:00–20:00) is a fixed default; there is no site-hours Setting.
- **Trust and integrations** (PLAN §18) — the hash chain is real (`db/hash.ts`, `audit`-only,
  verified against a real chain in item 20). Item 25 built the Integrations pane's on/off toggles
  as real, persisted settings; the QR verification switch is now real too, not just a persisted
  flag: `src-tauri/src/net/mod.rs` runs a LAN-only HTTP server (Tauri-only, off by default, started
  by the Integrations toggle) serving `/v/{doc_id}`, a page that checks both the doc row's
  `body_hash` and the full audit hash-chain (`store::verify_chain`) before calling a ticket
  authentic; `src/engines/print/qr.ts` renders a real, scannable QR on the printed A4 slip
  (`qrcode-generator`, offline, no network call) pointing at that page, and the thermal slip prints
  the same URL as text (a dot-matrix/thermal roll driven by this codebase's plain-text renderer has
  no bitmap-graphics path — no ESC/POS raster driver exists — so a printed URL is what "real" looks
  like there). LAN-only by default (PLAN §23 item 6's own answer: "local if hosted we can share the
  hosting url") — a public option is now real too: Settings → Connections' "Remote access" card
  (PLAN §18) saves a Cloudflare Tunnel connector token straight to the Windows Credential Manager
  (`src-tauri/src/security/mod.rs`, the `keyring` crate — never the settings table, never the
  repository) and `src-tauri/src/net/tunnel.rs` spawns `cloudflared tunnel run --token …` as a
  supervised child process when the switch is on. The tunnel itself (creating it, and mapping a
  public hostname to `http://localhost:8420`) is a one-time step the operator does on their own
  Cloudflare Zero Trust dashboard — this app never talks to the Cloudflare API and never learns a
  hostname, and it never downloads `cloudflared`: if it isn't already on PATH, the toggle fails with
  an actionable error rather than fetching a binary. Only the verification page rides this tunnel;
  there is no remote admin surface, so "shared by QR + admin access" is only half built. Tailscale
  remains the unbuilt private-mesh alternative. `WeighingScreen`'s print flow is now the outbox's
  first real producer: printing a slip that actually carries a `VerifyUrl` enqueues one
  `Channel: "Verification"` row (`DocId`, `TicketNo`, `VerifyUrl`) for whatever eventually makes
  that page reachable off the LAN to consume — nothing is enqueued when the integration is off or
  the ticket has no `DocId` yet, so there's never a job for a slip that carried no QR. Item 29 gave
  the `"Email"` channel a real, if minimal, consumer: the print flow itself attempts the send and
  reconciles the row to `Sent`/`Failed` synchronously — a "drain of one", not a background worker.
  Item 30 gave the `"Sms"` channel the same real, minimal consumer, over a serial GSM modem instead
  of SMTP. No worker drains any channel in the general case yet: webhook firing, cloud backup, and
  accounting-format export are all still unimplemented consumers pending future work, and no
  outdoor display board is driven. WhatsApp delivery is different from that list — item 31 records
  the decision to leave it decorative permanently, not queued: it has no free, ToS-compliant path.
  Anomaly detection is deferred by decision (PLAN §21 Phase 8); MiMaS is a Phase 7 item, not built,
  blocked on a spec that doesn't exist yet.
- **No OS-level scheduler or background service exists anywhere in this app** — item 32's
  `DailySummarySync` is a `setInterval` inside the running React app, not a Windows Task Scheduler
  entry or a Tauri background process; it only checks (and only can send) while the app happens to
  be open. A site that wants the summary out even on a morning nobody's opened BabuScales yet would
  need a real OS-level task calling into this app (or a small standalone sender), neither of which
  exists — stated plainly in the Scheduled daily summary card's own hint text and `AdminSetup.md`
  rather than left to be discovered.
- **Licensing** (PLAN §4.10/§12/§23 item 4, tasks #37/#38) — the offline activation-code format and
  its verification are real and exercised end to end (see `tools/license-format`'s own module doc
  for the full design and the "why asymmetric signing at all" reasoning): a ~15-character request
  code binds to this machine's own OS identifier (`machine-uid`, hashed), Babulens turns it into a
  ~124-character Ed25519-signed activation code with the offline, never-shipped `tools/licensegen`
  CLI, and `src-tauri/src/licensing/mod.rs` verifies it against a public key baked into the binary —
  no server, no network call, ever. Persistence is real too: a `"License"`-kind config row
  (`ConfigId: "license"`, `db/types.ts`'s `CONFIG_KINDS`) holds `TrialStartedOn`/`ActivationCode`
  through the same generic `get_config`/`save_config` commands every other Settings-shaped row uses
  (`@features/licensing/LicenseProvider`) — no config-specific Tauri command. Settings → System has
  a real Licence card: current state, the request code (read-only, focus-to-select), an
  admin-gated activation-code field that's validated against the real crypto _before_ it's ever
  persisted (a mistyped paste is reported back, never saved over a working code), and a Clear-code
  button. Gating is real and deliberately narrow: `TrialExpired`/`Expired`/`Invalid` blocks new
  weight captures and Save (`WeighingScreen`'s `licenseGated` prop) and shows a persistent
  `AppShell` banner (also used, non-blockingly, to flag "3 days left" on a running-low trial) — an
  already-open ticket's fields, Reports, Dashboard, Masters and reprinting a ticket already on disk
  all stay fully readable, so a lapsed licence never locks an operator out of data they're entitled
  to see, only out of adding more of it. **What's genuinely a placeholder:** `VENDOR_PUBLIC_KEY` in
  `tools/license-format/src/lib.rs` is a throwaway dev keypair generated while building this format,
  not Babulens' real signing key, which doesn't exist yet — PLAN §23 item 4 ("pricing and licence
  tiers") is still an open decision that key rotation waits on, same one-swap-away shape as the
  `BLS` logo placeholder (item 1). The 14-day trial length (`licensing::TRIAL_DAYS`) is likewise a
  placeholder pending that same open pricing decision.

## Carried over from the mock, verbatim

- `src/styles/tokens.css` — the six skins, as ~14 custom properties each.
- The status component (tare · gross · net), the open-ticket strip, the search popover, the
  three-step template wizard, the six-pane settings split, and the `Enter`-walks-everything
  keyboard model.

## Faked in the mock — build for real

Serial I/O · the database · printing · cameras · the hash chain · the formula parser.
