# BabuScales

**Weighbridge management software that a quarry can actually run.**

Live weight from the indicator, a hash-chained, QR-verifiable ticket that prints on whatever
printer the site already owns, and reports the owner can trust — on a 4GB office PC, with no
internet, in English or Tamil.

[![Release](https://img.shields.io/badge/release-phase_8%2F9_remaining-blue)](#roadmap)
[![Platform](https://img.shields.io/badge/platform-Windows-informational)](#install)
[![Licence](https://img.shields.io/badge/licence-proprietary-lightgrey)](#licence)

> **Status (2026-08-11): Phases 0–7 are built** — weighing, masters, printing, reports/dashboard,
> backup/restore, the audit hash chain with public QR verification, offline licence activation, a
> Windows installer, remote access, email/SMS delivery and Android packaging all run for real in
> **[`app/`](app/README.md)** against a real SQLite database, not just the mock. What's left is
> Phase 8 (ANPR, visual template designer, anomaly detection — deferred by decision, not started),
> Phase 9 (a full test suite — in progress, currently paused by request), MiMaS (blocked on a spec
> that doesn't exist yet), and a short list of real, known gaps — see
> **[`docs/Features.md`](docs/Features.md)** for the current feature-by-feature state, or
> `app/README.md`'s "Known gap" section for the full narrative. The full technical plan is in
> **[PLAN.md](PLAN.md)**.
>
> This repository has a GitHub remote configured but hasn't been pushed yet, so the *Open the demo*
> and *Releases* links below aren't live — everything under `app/` runs locally today; open
> `demo/BabuScales-demo.html` in any browser in the meantime for the original one-file, no-build,
> no-database mock this application was built against.

---

## Why BabuScales exists

A weighbridge is a machine that turns trust into money. The number on the ticket settles what a
buyer pays, what a transporter is owed, and what a department is told. Everyone at the bridge has
a reason to want that number to move.

Most weighbridge software treats this as a data-entry problem. BabuScales treats it as an
**evidence** problem — every weight is captured from the indicator only when stable, photographed
from every angle, stamped with the operator who took it, and written into a hash-chained record
that cannot be quietly edited afterwards.

And every customer's ticket looks different. Historically that meant a code change and a new
release for each site. In BabuScales, **a customer's fields, screen layout, ticket design, charging
rules and numbering are all configuration** — onboarding a new site is an afternoon, not a build.

---

## What it does

### Weighing
- Two-trip **gross/tare** in either order, or one-trip against a **stored tare**
- **Strict tare** (re-weigh every time) and **loose tare** (reuse a stored one, with expiry)
- Weight accepted only after the indicator reports consecutive **stable** readings
- Every capture keeps its own **date, time, operator and photographs**
- **Many lorries at once** — save the first weight and the deck is free immediately. Every ticket
  waiting for its second weight sits in a strip on the weighing screen; click one when the lorry
  returns. Nobody queues behind the last vehicle

### Evidence
- **Public QR verification** — anyone can scan a ticket and confirm it is genuine
- Hash-chained audit: altering history breaks the chain and is detected
- Camera tiles beside the weight, driven by live ticket state — real USB/IP/RTSP/ONVIF capture,
  per-camera crop, burned-in overlays and offline ANPR are designed for but not built yet (see
  [`docs/Features.md`](docs/Features.md))

### Printing
One content model, three printer classes — because sites own what they own.

| | |
|---|---|
| **Dot matrix** | Raw text via the OS print dialog. Continuous stationery, carbon copies |
| **A4 / A5** | Full typography, logo, QR, print preview before committing |
| **Thermal** | ESC-POS-style tokens and gate passes |

Multi-copy DUPLICATE watermarking and mass print from Reports are built; a visual designer for
custom layouts, pre-printed-stationery alignment, and a true RAW/ESC-P spooler path (bypassing the
OS print dialog) are designed for but not built yet.

### Everything else
Real billing (flat, configurable-later rate) · searchable masters · report builder with
Excel/CSV export · verified manual backups · English and **தமிழ்**, keyboard-first navigation ·
optional LAN/public access via Cloudflare Tunnel (off by default) · runs entirely offline.

---

## Try it without installing

`.github/workflows/pages.yml` builds and deploys **the real application running with no
database** — same screens, same flow, a simulated indicator producing live weights, the memory
`DataPort` adapter standing in for SQLite. Not a mock-up; it's the same `app/` source everything
else in this README describes.

**→ Open the demo** — live once this repository is pushed to a public GitHub remote and the Pages
workflow has run once (not yet — see the status note above).

---

## Install

Download the `.msi` or the NSIS `.exe` from [Releases](../../releases) and run it — either does the
same job. Around 200MB: the entire WebView2 Evergreen Runtime is baked into the installer itself so
a site with no internet connection at install time still installs cleanly, rather than shipping the
usual few-MB stub that fetches it separately. No Java, no separate runtime to install, no internet
needed once the installer file itself is on the machine.

**Requirements:** Windows 10 or 11 · 4GB RAM · a serial or USB weight indicator.
Cameras, printers and network are all optional.

---

## Built with

| | |
|---|---|
| **Tauri v2 + Rust** | ~70MB RAM, sub-second start, one codebase for the future Android app — installer is ~200MB with the WebView2 runtime baked in for offline installs (see Install, above) |
| **React 19 + TypeScript** | Same UI on desktop, LAN, phone and the browser demo |
| **SQLite** | One file. Fixed tables, zero migrations, everything — including images — inside it |

Chosen deliberately for **4GB machines**: the whole application uses less memory than a browser tab.

---

## Documentation

| | |
|---|---|
| [PLAN.md](PLAN.md) | Full technical plan |
| [docs/Features.md](docs/Features.md) | Current feature inventory — what's real, partial or not built, today |
| [docs/OperatorGuide.md](docs/OperatorGuide.md) | Day-to-day use, for whoever weighs vehicles |
| [docs/AdminSetup.md](docs/AdminSetup.md) | Install, licence, configure — for whoever sets a site up |
| [docs/CodingStandards.md](docs/CodingStandards.md) | How this codebase is written, and what CI enforces |
| [docs/Terminology.md](docs/Terminology.md) | The words we use and why |

`docs/JsonConfig.md`, `docs/PrintTemplate.md`, `docs/FormulaNotes.md`, `docs/Security.md` and
`docs/DecisionLog.md` are named in `PLAN.md` §19 as intended documentation but don't exist yet —
a real, tracked gap, not a broken link to ignore.

---

## Roadmap

`PLAN.md`'s own phase table (§21) — this is the live status, not the original draft order:

| Phase | | |
|---|---|---|
| 0 | Groundwork | Superseded — shipped without the site-preset/pdfium spike; printing goes through the OS dialog instead |
| 0.5 | Mock | **Done.** Four review rounds on `demo/BabuScales-demo.html` — the reference spec for Phase 1+ |
| 1 | Foundation | **Done.** Scaffold, schema, `DataPort` + adapters, component library, i18n, CI, backup/restore |
| 2 | Core | **Done.** Schema + formula engines, capture model, masters + search, indicator, hash chain |
| 3 | Print | **Done, scoped down.** No Windows RAW/ESC-P spooler path yet |
| 4 | Capture | **Not really done.** Cameras are the mock's own decorative fixture — no real capture |
| 5 | Insight | **Done.** Reports, dashboard, Excel/CSV export, mass print |
| 6 | Trust & release | **Done.** QR verification, offline licensing, Windows installer |
| 7 | Reach | **Done except MiMaS** (blocked, no spec) **and WhatsApp** (permanently decorative, by decision) |
| 8 | Deferred by decision | Not started — ANPR, visual template designer, anomaly detection |
| 9 | Tests | Paused mid-flight — `components/`, `constants/`, `formulaEngine/` covered (114 tests), rest on hold |

See [`docs/Features.md`](docs/Features.md) for the feature-level detail behind each phase, and
`PLAN.md` §21's "What's left" for the concrete backlog.

---

## Compliance

Tamil Nadu has **mandated integration between the e-permit system and digital weighbridges** for
all quarry and crusher units, to curb excess quarrying and unauthorised mineral transport.
BabuScales is being designed for that requirement from the start — permit references, quantity
balances and a durable submission queue are part of the core data model, with the
**MiMaS** client landing in Phase 7 — blocked today on an integration spec that doesn't exist yet.

---

## Licence

Proprietary. © Babulens. For enquiries, contact Babulens.

---

<div align="center">

**Babulens** · Nagercoil, Tamil Nadu

</div>
