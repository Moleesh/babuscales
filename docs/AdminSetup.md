# Admin setup guide

For whoever installs BabuScales, licenses it, and configures the site once so operators can just
weigh vehicles. Pairs with [OperatorGuide.md](OperatorGuide.md) (day-to-day use) and
[Terminology.md](Terminology.md) (what every word means). Every screen name, card title and default
below is copied from the running app — where a feature isn't finished, that's said plainly rather
than glossed over.

## 1. Installing

Two installers come out of every release, `BabuScales_<version>_x64_en-US.msi` and
`BabuScales_<version>_x64-setup.exe` (NSIS) — either does the same job, pick whichever your site's
policy prefers. Both run **~200MB**, not the handful of MB a typical Tauri app ships: they carry the
entire WebView2 Evergreen Runtime baked in, on purpose, so a quarry with no internet connection at
install time still installs cleanly rather than failing on a runtime download. A USB stick or LAN
copy handles that size without trouble.

Installs per-machine (not per-user) and needs no separate download step afterwards — first launch
just works.

## 2. First run and licensing

Every install starts a **free 14-day trial** the moment it's first opened — no account, no server
call, nothing to set up. The trial clock and, once licensed, the activation code both live in a
`config` row on this machine only; nothing about licensing ever leaves it except the one request
code you send out manually.

To license a site, open **Settings → System → Licence**:

| Field | What it is |
|---|---|
| Status line | Plain-English current state — trial (with days left), Licensed, Expired, or Invalid. |
| Request code | Read-only, click to select-all. A short code derived from this machine's own hardware ID. |
| Activation code | Where you paste back what Babulens sends you. |

Send the request code to Babulens (there's no in-app contact directory yet — use whoever supplied
this install). They sign it offline against that machine ID and send back a longer activation code;
paste it into **Activation code** and press **Activate**. The whole exchange is offline — Babulens
never sees this machine over a network, and this app never calls out to check licensing. A pasted
code is validated before it's saved, so a typo is reported back rather than silently corrupting a
working licence. **Bound to this machine**: it stops working after a hardware change or on a
different install, and needs a fresh code each time.

## 3. The admin password

Everything under Settings except the Licence card's status line is **read-only until unlocked**.
Click **🔒 Admin lock** in the top bar and enter the admin password — the default on every fresh
install is **`1234`**. Change it immediately: unlock Settings, go to **System → Date, time &
amounts**, and set a new one in the **Admin password** field (it saves on blur or Enter, no separate
save button).

This is a single shared password gating "can this workstation's Settings be changed", not a
per-person login — it doesn't identify who made a change, and there's no user list. **Operator on
duty** (the name that ends up on tickets) is separate and needs no password at all — anyone can
change it from the top-bar chip, by design, since it's just a name for the ticket, not an account.

## 4. Touring Settings' six panes

Settings is one screen with six tabs. What's real and wired up in each, as of this build:

**Fields & language** — *Language packs* is real: drop a language-pack `.json` (or click to choose)
and it applies immediately, alongside English, without a restart. *Field schema* — changing field
labels/required-ness by uploading a schema — is a documented placeholder; it needs schema-driven
field rendering, which doesn't exist yet, so Weighing's fields stay a fixed layout regardless of
what's uploaded here.

**Print & printers** — *Printers* picks which registered printer each paper size (A4, dot-matrix,
thermal) prints to; the change applies immediately, no save button. Every ticket print goes through
the OS's own print dialog (`window.print()`), where the operator picks the physical printer — this
app never routes output silently. *Print templates* — a visual layout designer — isn't built; the
three built-in layouts are the only ones available.

**Appearance** — *Operator on duty* is real (see above). *Theme* is a placeholder; switching it
doesn't yet change how the app looks.

**Weighing** — *Weighing rules* and *Fixed policy* configure capture behaviour: the stability gate
before a reading is accepted, and similar fixed policy toggles. Applies immediately.

**Connections** — six cards:
- *Integrations* — eight on/off toggles (WhatsApp, SMS gateway, e-mail, cloud backup, webhook/REST,
  QR verification page, accounting export, outdoor display board). **QR verification**, **e-mail**
  and **SMS gateway** are real, working integrations; the other five persist as a setting but have
  nothing behind them yet (no provider, no worker draining the queue) — turning them on doesn't send
  anything anywhere.
- *E-mail delivery* — SMTP host, port, username and password (the password goes to Windows
  Credential Manager, same as the tunnel token below), plus a "Send test e-mail" button. When
  Integrations → E-mail is on and a ticket's party has an **E-mail** saved in Masters, printing
  that ticket sends it a copy immediately and reports success or failure — there's no retry queue
  yet, just the one attempt at print time.
- *SMS delivery* — serial port and baud rate for a GSM modem (a SIM-equipped modem or phone that
  exposes a plain AT-command serial/USB interface — no cloud SMS-gateway account, no per-message
  cost beyond your SIM's own), plus a "Send test SMS" button. Same trigger as e-mail: Integrations →
  SMS gateway on, and a ticket's party has a **Phone** saved in Masters, and printing sends it a text
  immediately — same "one attempt at print time, no retry queue" honesty as e-mail.
- *Remote access* — a Cloudflare Tunnel connector token, stored in Windows Credential Manager, never
  in the settings table or the database. This app never talks to the Cloudflare API and never
  learns a public hostname — creating the tunnel and pointing a hostname at this machine is a
  one-time step you do yourself on Cloudflare's own dashboard first. If `cloudflared` isn't already
  on this machine's PATH, the toggle fails with an actionable error rather than trying to fetch it.
- *Weight indicator* — serial port and baud rate for a real weighbridge indicator, plus an optional
  custom regex pattern for indicators the built-in parser doesn't recognize out of the box. Without
  real indicator hardware connected, Weighing falls back to the on-screen simulator (`Send a
  lorry`).

**System** — *Ticket numbering* (prefix, digit width, manual or automatic reset), *Date, time &
amounts* (display formats — currently saved but not yet read by Reports, Dashboard or the printed
slip, which still use the browser's own formatting), the **admin password** field, **Scheduled
daily summary** (an automatic e-mail — tickets, net tonnes and charge collected today, plus a
by-material breakdown — sent once a day at a time you choose, over the same SMTP relay as
Connections → E-mail delivery; a "Send now" button sends today's numbers on demand, useful both as
a real manual summary and to confirm the relay and recipient are right before relying on the
scheduled send). This one only runs while the app is open — there's no background service on this
machine, so a workstation that's off or asleep at the scheduled time sends nothing until it's next
opened, same honesty as every other channel here having no retry queue. **Backup & restore**, and
**Licence** (§2 above).

## 5. Backup and restore

**Settings → System → Backup & restore.** This is real data leaving the machine it lives on, not
just a settings toggle:

- **Save a backup** works even while Settings is locked — anyone at the machine can take one, no
  password needed to read your own data out. It downloads a file (`babuscales-backup-<timestamp
  >.bak`) — a checksummed, integrity-checked SQLite snapshot on a real install, a full JSON export
  in the browser demo.
- **Restore from a backup…** needs the admin password, and a confirm step, because it **replaces
  every ticket, master and setting currently saved here** — there's no partial or merge restore.

Keep saved backups off the machine itself — a USB stick or another computer — since a backup that
only ever lives next to the database it protects doesn't survive that database's own machine
failing. Nothing here schedules backups automatically; taking one is a deliberate, manual action
each time, same as restoring one.

## 6. Masters — set these up before operators start weighing

**Masters** (the `◈` tab) holds eight kinds of saved record: **Parties, Materials, Vehicles,
Vehicle types, Transporters, Places, Operators, Stored tares.** None of it needs Settings unlocked —
Masters has its own add/search flow open to whoever's using the app. Populate at least Parties,
Materials and Vehicle types before go-live; Weighing's own dropdowns search this list, so an empty
Masters screen means typing full names into every ticket by hand instead of picking from a list.

## 7. QR verification (if you want it)

Turning on **Connections → Integrations → QR verification page** starts a small LAN-only HTTP
server (Tauri build only — not available in the browser demo) that serves a page proving a printed
ticket is authentic, by checking both the ticket's own hash and the full audit hash-chain behind it.
Every A4 slip printed while it's on carries a scannable QR code pointing at that page; a thermal
slip prints the same address as plain text instead (no bitmap-graphics path exists for thermal
printing here). LAN-only by default — to make it reachable from outside the site network, also
configure **Remote access** (§4 above) with a Cloudflare Tunnel.

## 8. What isn't built yet

Documented in full in [`app/README.md`](../app/README.md)'s "Known gap" section — the short version
for an admin deciding what to promise a site:

- No real camera capture, per-operator login, or FTS5-scale Masters search (fine at single-site
  scale, not at 100,000+ rows).
- Reports has no date-range filter and no PDF/Excel/CSV export (buttons are shown disabled, not
  hidden — matching the reference spec's own dead buttons rather than pretending they work).
- Of the eight Integrations toggles, only QR verification, e-mail and SMS gateway actually do
  anything yet — cloud backup, webhook, accounting export and the outdoor display board persist
  as a setting with no worker behind them, pending future work.
- WhatsApp is the one toggle that will *stay* decorative — a deliberate decision, not a queued gap.
  It only has two paths in: Meta's official Cloud API, which needs a paid, Meta-approved business
  account and a per-message cost, or unofficial libraries that impersonate a WhatsApp Web session,
  which violate WhatsApp's Terms of Service and risk the site's own number getting banned. Neither
  is something to ship into a paid product, unlike SMS (§4 above), which sidesteps any such cost or
  risk entirely by talking to a plain serial GSM modem instead of a cloud provider.
- Billing (`Charge`) is a flat, hardcoded rate — there's no Settings screen to change it.
- MiMaS integration is blocked on an external specification that doesn't exist yet; not a bug, not
  in progress.

None of this blocks day-to-day ticketing — it's what to tell a site up front rather than let them
discover by hitting a dead button.
