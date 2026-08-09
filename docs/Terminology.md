# Terminology

One word per concept, used **identically** in code, database, UI, templates and documentation.
Taken from the weighbridge trade, corrected where the old naming was ambiguous.

If a term is not here, it is not a domain term — do not invent one.

---

## Core

| Term | Meaning | Replaces | Why changed |
|---|---|---|---|
| **Ticket** | The whole weighing transaction | Weighing, SLNO row, slip | "Weighing" meant both the record and the act |
| **Capture** | One weight reading, with its own time, operator, source and photos | Gross Wt / Tare Wt columns | A ticket has an ordered list of captures, which is what makes multi-gross possible |
| **Gross** | Weight of the loaded vehicle | — | Kept |
| **Tare** | Weight of the empty vehicle | — | Kept |
| **Net** | Gross − Tare | NETT / NETTWT | `Net`, one T. The old spelling was inconsistent between versions |
| **Ticket No** | Human-facing number on the ticket | Sl.No, SLNO, Slip No | "Serial number" collided with serial *ports* throughout the old code |
| **Stored Tare** | A saved tare reused for one-trip weighing | Vehicle Tares | Says what it is for |

## People and parties

| Term | Meaning | Replaces |
|---|---|---|
| **Party** | The customer, buyer or hirer on the ticket | Customer's Name, CUSTOMERNAME |
| **Transporter** | Haulier or driver | Driver Name / Transporter (was both) |
| **Operator** | The person who took a capture | Operator Tare / Operator Gross |
| **Admin** | Holder of the admin password | ten separate passwords |

## Goods and vehicle

| Term | Meaning |
|---|---|
| **Material** | What is being weighed. Carries rate and bag weight |
| **Vehicle** | The lorry, identified by **Vehicle No** |
| **Vehicle Type** | Class of vehicle. Carries its own tare and gross charge |
| **Place** | Origin or destination |
| **Challan No** | Delivery challan reference *(was DC No)* |

## Money

| Term | Meaning | Replaces |
|---|---|---|
| **Charge** | Money charged for the weighing | Charges, Final Amount, DEFAULT_CHARGE |
| **Rate** | Price per unit of material | COST |
| **Credit** | Ticket billed to an account rather than paid now | Kept |

## Configuration

| Term | Meaning | Replaces |
|---|---|---|
| **Schema** | Definition of what fields exist | — |
| **Layout** | Where fields appear on screen | — |
| **Template** | How a document prints | html file |
| **Format** | Which template is selected | Print Option, PRINTOPTIONFORWEIGHT, REPORT |
| **Master** | Reference data — parties, materials, vehicles, places | separate tables per kind |
| **Preset** | A named bundle of settings for a site style | Kotta / Godown / Ice-water settings |
| **Formula** | A computed field expression | auto-charge, round-off, bag-weight logic |

## Documents

| Term | Meaning |
|---|---|
| **Weight Ticket** | The main printed output |
| **Tare Token** | Interim slip printed after the first capture |
| **Exit Pass** | Gate pass on leaving |
| **Invoice** | Billing document |
| **Report** | A queried, printable set of tickets |

## System

| Term | Meaning |
|---|---|
| **Indicator** | The weight display head on the bridge, read over serial |
| **Stable** | Indicator has reported N consecutive agreeing readings — the only state in which a capture is allowed |
| **Deck** | The platform the vehicle drives onto |
| **Journal** | Durability log written before any change is applied |
| **Outbox** | Durable queue for outbound integration calls |
| **Audit** | Append-only, hash-chained record of every action |
| **Asset** | Any binary stored in the database — image, logo, font, template resource. The table is `asset`; "blob" is the SQLite storage type, not our term |

---

## Deliberately not used

| Avoid | Use instead | Reason |
|---|---|---|
| Slip | **Ticket** | Ambiguous between the record and the paper |
| Serial No | **Ticket No** | Collides with serial ports |
| Nett | **Net** | Non-standard spelling |
| Customer | **Party** | Implies a direction that is often wrong |
| Weighment | **Ticket** or **Capture** | Say which one is meant |
| Profile | — | Removed. Was multi-tenancy, unused in practice |
| Webcam | **Camera** | Most are IP cameras, not webcams |
| User | **Operator** or **Admin** | Say which |
