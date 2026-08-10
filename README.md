# BabuScales

**Weighbridge management software that a quarry can actually run.**

Live weight from the indicator, photographic evidence from up to four cameras, a ticket that
prints on whatever printer the site already owns, and reports the owner can trust — on a 4GB
office PC, with no internet, in English or Tamil.

[![Release](https://img.shields.io/badge/release-planning-blue)](#roadmap)
[![Platform](https://img.shields.io/badge/platform-Windows-informational)](#install)
[![Licence](https://img.shields.io/badge/licence-proprietary-lightgrey)](#licence)

> **Status: Phase 6 (Trust & release) underway — the 3.0 line PLAN.md marks as shippable.**
> The interactive mock in **[`demo/BabuScales-demo.html`](demo/BabuScales-demo.html)** was the
> reference spec for Phases 0–5, all of which are built: weighing, masters, printing, cameras,
> reports/dashboard and backup/restore all run for real in **[`app/`](app/README.md)** against a
> real SQLite database, not just the mock. Phase 6 has added a real audit hash chain with public QR
> verification, offline licence activation, a Windows installer, and this pass of documentation —
> see `app/README.md`'s own numbered list and "Known gap" section for exactly what's real versus
> still aspirational. The full technical plan is in **[PLAN.md](PLAN.md)**.
>
> This repository hasn't been pushed to a public remote yet, so the *Open the demo* and *Releases*
> links below aren't live — everything under `app/` runs locally today; open
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
- Up to **4 cameras** — USB, IP, RTSP, ONVIF — with per-camera crop and auto-capture
- **ANPR** reads the number plate offline and flags mismatches with what was typed
- Ticket number, weight and time **burned into the image**, so a photo explains itself
- **Public QR verification** — anyone can scan a ticket and confirm it is genuine
- Hash-chained audit: altering history breaks the chain and is detected

### Printing
One design, three printer classes — because sites own what they own.

| | |
|---|---|
| **Dot matrix** | Raw ESC/P. Instant, driver-free, continuous stationery, carbon copies |
| **A4 / A5** | Full typography, logo, QR, photographs |
| **Thermal** | ESC-POS tokens and gate passes |

Plus pre-printed stationery with on-screen alignment, multi-copy watermarks, mass print, and a
**visual designer** so you never hand-edit a template.

### Everything else
Formula-driven charging · searchable masters that stay instant at 100,000 rows · report builder
with Excel/CSV/PDF export · verified scheduled backups · English and **தமிழ்** ·
LAN access from any phone (off by default) · runs entirely offline.

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
| [docs/OperatorGuide.md](docs/OperatorGuide.md) | Day-to-day use, for whoever weighs vehicles |
| [docs/AdminSetup.md](docs/AdminSetup.md) | Install, licence, configure — for whoever sets a site up |
| [docs/CodingStandards.md](docs/CodingStandards.md) | How this codebase is written, and what CI enforces |
| [docs/Terminology.md](docs/Terminology.md) | The words we use and why |
| [docs/JsonConfig.md](docs/JsonConfig.md) | Schema, layout, template and settings contracts |
| [docs/PrintTemplate.md](docs/PrintTemplate.md) | Template model and placeholders |
| [docs/FormulaNotes.md](docs/FormulaNotes.md) | Formula language and decimal policy |
| [docs/Security.md](docs/Security.md) | Threat model, secrets, audit chain |
| [docs/DecisionLog.md](docs/DecisionLog.md) | Every significant decision, and what was rejected |

---

## Roadmap

PLAN.md's own phase table (§21), resequenced after review to remove forward dependencies — this is
the live plan, not the original draft order:

| Phase | | |
|---|---|---|
| 0 | Groundwork | Reverse-engineer the v1 site presets and hardest print format before the formula language locks |
| 0.5 | Mock | **Done.** Four review rounds on `demo/BabuScales-demo.html` — the reference spec for Phase 1+ |
| 1 | Foundation | Scaffold, schema, `DataPort` + adapters, component library, i18n, CI, live demo, backup/restore from day one |
| 2 | Core | Schema engine, formula engine, capture model, masters + search, indicator, hash chain on `audit` |
| 3 | Print | Content model, three layout engines, the six real v1 formats, printer capability profiles |
| 4 | Capture | 4 cameras, crop, overlay, ONVIF/RTSP, retention, live view |
| 5 | Insight | Reports, dashboard, Excel/CSV import-export, custom indexes, mass print |
| 6 | **Trust & release** | QR verification, licensing, installer, docs, landing page — **3.0 ships** |
| 7 | Reach | Remote access, WhatsApp/SMS, scheduled reports, multi-gross, legacy import, MiMaS, Android |
| 8 | Deferred by decision | ANPR, visual template designer, anomaly detection — designed for, not built |
| 9 | Tests | Full suite — last phase, by decision |

Currently in **Phase 6**: QR verification, offline licensing and the Windows installer are done;
this documentation pass is the last item before "3.0 ships".

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
