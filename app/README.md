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
    `@media print` rule, then commits the existing `PrintCount` increment. Deliberately drops the
    mock's "Verify: babuscale.app/v/…" footer line — that URL doesn't resolve to anything (no QR
    verification hosting — see Known gap), and a dead link on an actual printed business document
    would be worse than the mock's own fake demo copy. Charge read "—" at the time this item
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
    click handler at all in `demo/BabuScale-demo.html` — not a corner this app cut, the reference
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
    relabelled "Turn on"), clicked E-mail's Configure and confirmed the exact flash text.
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

## Known gap

**Real serial-port indicator adapter, but not the full PLAN §17 wizard** — item 21 above built the
adapter, the pure parser, and a scoped-down Connections pane; not built: the "watch raw bytes
live, confirm" wizard steps, true multi-brand protocol auto-detection (one general fallback parser
plus a manual regex override stands in for it), and everything past the indicator in PLAN §17's
hardware list (LED display output, boom barrier/traffic light relays, presence sensor, TTS
announcements, RFID/barcode, SMS via serial GSM modem). None of it has been run against a real
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
- **Master field richness** — generic Name/Notes only, except StoredTare and now Material (item
  26's Rate field). No GST fields on Party — the mock never defines one either (its static `PARTIES`
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
  Fields & language still renders as a named placeholder, pending the Schema-config editor it
  would need (see "Schema-driven rendering" below). Within System, ticket
  numbering is live and `Formats.AmountDp` now reaches every money display (item 20); date/time
  formats are still only persisted, unread elsewhere. The stale-tare threshold
  (`STORED_TARE_STALE_AFTER_DAYS` in `src/db/storedTare.ts`) stays a fixed constant — the mock
  itself never exposes it as a setting either (`ex:"expired"` is static demo master data, not
  computed from a configurable day count).
- **Schema-driven rendering** — Weighing pulls field _labels_ from `DEFAULT_TICKET_SCHEMA` but
  does not render fields generically from schema/formula config; that needs a Settings pane to
  edit `Schema` rows first.
- **Billing** — Charge is real (item 20: `engines/billing`, wired into Weighing, Reports,
  Dashboard, and the print slip), but flat and hardcoded (`TARE_CHARGE_INR` + `GROSS_CHARGE_INR`),
  matching the mock's own actual runtime behaviour rather than its schema's aspirational
  vehicle-type formula. Item 26 built Value (`computeValue`, Material.Rate-based) alongside it —
  both stop at the "Captured & calculated" card's formula breakdown, though; neither reaches
  Reports, Dashboard or the print slip the way Charge does (a real gap, not a deliberate one —
  tracked here rather than silently left out). No Settings-driven way to change the flat Charge
  rate exists either.
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
- **`CaptureTimeline`** (named in PLAN's architecture list) was not built — Weighing's "Captured &
  calculated" card uses the mock's `.calc` three-box grid instead.
- **Dashboard's hourly window** (06:00–20:00) is a fixed default; there is no site-hours Setting.
- **Trust and integrations** (PLAN §18) — the hash chain is real (`db/hash.ts`, `audit`-only,
  verified against a real chain in item 20). Item 25 built the Integrations pane's on/off toggles
  as real, persisted settings, but nothing behind any of those eight switches actually sends
  anything: no outbox worker delivers WhatsApp/SMS/e-mail, no public QR-verification page exists
  (the mock's own thermal-slip QR is decorative text — `[ QR ]  <ticket no>` — not a real code or
  URL, and a genuinely public verification page needs a hosting story this project doesn't have
  yet), no webhook fires, no cloud backup provider is wired, no accounting-format export runs, no
  outdoor display board is driven. Anomaly detection is deferred by decision (PLAN §21 Phase 8),
  Cloudflare Tunnel/Tailscale remote access and MiMaS are Phase 7 items, neither built.

## Carried over from the mock, verbatim

- `src/styles/tokens.css` — the six skins, as ~14 custom properties each.
- The status component (tare · gross · net), the open-ticket strip, the search popover, the
  three-step template wizard, the six-pane settings split, and the `Enter`-walks-everything
  keyboard model.

## Faked in the mock — build for real

Serial I/O · the database · printing · cameras · the hash chain · the formula parser.
