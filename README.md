# BabuScales

**Weighbridge management software that a quarry can actually run.**

Live weight from the indicator, photographic evidence from up to four cameras, a ticket that
prints on whatever printer the site already owns, and reports the owner can trust — on a 4GB
office PC, with no internet, in English or Tamil.

[![Release](https://img.shields.io/badge/release-planning-blue)](#roadmap)
[![Platform](https://img.shields.io/badge/platform-Windows-informational)](#install)
[![Licence](https://img.shields.io/badge/licence-proprietary-lightgrey)](#licence)

> **Status: Phase 1 foundation underway.** The interactive mock in
> **[`demo/BabuScales-demo.html`](demo/BabuScales-demo.html)** has been through four rounds of review
> and is the reference specification. The application is being built in
> **[`app/`](app/README.md)**, where the scaffold, the `DataPort` contract with a verified memory
> adapter, the fixed SQLite schema with an idempotent patch runner, backup/restore, i18n with the
> per-tab help drawer, and the CI/Pages/release workflows are done — see `app/README.md` for what's
> next. The full technical plan is in **[PLAN.md](PLAN.md)**.
>
> Open `demo/BabuScales-demo.html` in any browser — one file, no build, no dependencies, no database.

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

The GitHub Pages build is **the real application running with no database** — same screens, same
flow, a simulated indicator producing live weights. Not a mock-up.

**[→ Open the demo](#)** *(available from Phase 0)*

---

## Install

Download the `.msi` from [Releases](../../releases) and run it. Roughly 10MB, no prerequisites,
no Java, no runtime to install.

**Requirements:** Windows 10 or 11 · 4GB RAM · a serial or USB weight indicator.
Cameras, printers and network are all optional.

---

## Built with

| | |
|---|---|
| **Tauri v2 + Rust** | ~10MB installer, ~70MB RAM, sub-second start, one codebase for the future Android app |
| **React 19 + TypeScript** | Same UI on desktop, LAN, phone and the browser demo |
| **SQLite** | One file. Fixed tables, zero migrations, everything — including images — inside it |

Chosen deliberately for **4GB machines**: the whole application uses less memory than a browser tab.

---

## Documentation

| | |
|---|---|
| [PLAN.md](PLAN.md) | Full technical plan |
| [docs/CodingStandards.md](docs/CodingStandards.md) | How this codebase is written, and what CI enforces |
| [docs/Terminology.md](docs/Terminology.md) | The words we use and why |
| [docs/JsonConfig.md](docs/JsonConfig.md) | Schema, layout, template and settings contracts |
| [docs/PrintTemplate.md](docs/PrintTemplate.md) | Template model and placeholders |
| [docs/FormulaNotes.md](docs/FormulaNotes.md) | Formula language and decimal policy |
| [docs/Security.md](docs/Security.md) | Threat model, secrets, audit chain |
| [docs/DecisionLog.md](docs/DecisionLog.md) | Every significant decision, and what was rejected |

---

## Roadmap

| Phase | | |
|---|---|---|
| 0 | Foundation | Shell, schema, component library, i18n, CI, live demo |
| 1 | Core | Formula engine, capture model, masters, indicator |
| 2 | Print | Three printer targets, templates, mass print |
| 3 | Capture | Eight cameras, crop, overlay, retention |
| 4 | Insight | Reports, dashboard, import/export, backup |
| 5 | Designer | Visual template and schema editors |
| 6 | Trust | Hash chain, QR verification, anomaly detection, ANPR |
| 7 | **Release 3.0** | Licensing, installer, documentation |
| 8 | Reach | Remote access, WhatsApp/SMS, multi-gross, Android, MiMaS |
| 9 | Tests | Full suite |

---

## Compliance

Tamil Nadu has **mandated integration between the e-permit system and digital weighbridges** for
all quarry and crusher units, to curb excess quarrying and unauthorised mineral transport.
BabuScales is being designed for that requirement from the start — permit references, quantity
balances and a durable submission queue are part of the core data model, with the
**MiMaS** client landing in Phase 8.

---

## Licence

Proprietary. © Babulens. For enquiries, contact Babulens.

---

<div align="center">

**Babulens** · Nagercoil, Tamil Nadu

</div>
