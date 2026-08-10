# Operator quick-start

For the person on the weighbridge, ticket after ticket. Every screen name and button label below is
copied from the running app, not paraphrased — if what you see doesn't match, you're looking at an
older build. Terms not explained here are in [Terminology.md](Terminology.md).

## The screen, top to bottom

The top bar never changes, whichever of the six tabs you're on:

| Element | What it does |
|---|---|
| **BS** mark + business name | Your site's name and bridge, set once by the admin (System pane). |
| `▩ Dashboard` `◎ Weighing` `▣ Cameras` `▦ Reports` `◈ Masters` `⚙ Settings` | The six tabs. Weighing is where a ticket actually gets made; the rest support it. |
| Language button (e.g. `தமிழ்`) | Switches every label on screen to an installed language pack. Doesn't touch saved data — a ticket saved in Tamil reads back the same in English. |
| `Operator: <name> ✎` | Click to change who's on duty. No password — it's a name for the ticket, not a login. Set it at the start of your shift so tickets carry the right name. |
| `🔒 Locked` / `🔓 Unlocked` | Whether Settings can be changed right now. Stays locked all shift unless the admin unlocks it — you don't need it unlocked to weigh. |
| `?` | Help for whichever tab you're on — pulls up field-by-field notes without leaving the screen. |

## Weighing a vehicle, start to finish

The Weighing tab has three working areas: the **indicator** strip at the top (live weight, `STABLE`
or `MOTION`), the **Ticket** card (party, material, vehicle, transporter — the who/what), and the
**Captured & calculated** card (the two weighings and everything derived from them).

1. **Fill in the Ticket card.** Party, Material, Vehicle and the rest are searchable dropdowns —
   type a few letters of a saved name rather than scrolling. Anything not yet saved as a master can
   usually be added right there (see Masters below) rather than making you leave the screen.
2. **Capture a weighing.** With a vehicle on the bridge and the indicator reading `STABLE`, press
   `Tare` for an empty vehicle or `Gross` for a loaded one — whichever this leg of the trip actually
   is. The reading locks into the Captured & calculated card. If the vehicle has a **stored tare**
   (a tare weight saved from a past visit), it can fill in without a second weighing — the card
   tells you when it's used one.
3. **Capture the other side.** A ticket needs both a tare and a gross before it has a net weight.
   Send the vehicle back out and weigh it again later if this is only the first leg — `Save & park`
   holds the ticket open for that (see below).
4. **Check the numbers**, then either:
   - `Save & park` — saves what you have so far without closing the ticket, for a vehicle that's
     coming back for its second weighing later. The ticket reappears via **Recall** (a banner at
     the top of Weighing) when you search for that vehicle or party again.
   - `Print` — finishes the ticket and sends it to the printer registered for its paper size
     (Settings → Print & printers picks which one; you're never asked to choose here). A ticket
     with QR verification switched on prints a scannable QR code on an A4 slip, or the same
     verification address as plain text on a thermal roll.
5. **`Reprint`** brings back the print dialog for the ticket that's currently open, in case the
   first copy jammed or the party wants a spare. **`New ticket`** clears the screen for the next
   vehicle. **`Clear`** wipes the current form without saving anything — use it for a mis-entered
   ticket you haven't printed yet, not for one that's already saved.

**`Send a lorry`** is the simulator's own control, standing in for a vehicle actually driving onto
the bridge — press it to make the indicator move and settle, useful for testing or demos on a
machine with no real weighbridge attached. On a site with a real indicator wired up (Settings →
Connections → Weight indicator), the reading comes from the hardware instead and this button isn't
what drives it.

## Masters — everything you look up while weighing

One screen (the `◈ Masters` tab) covers all eight kinds of saved record, in this order: **Parties,
Materials, Vehicles, Vehicle types, Transporters, Places, Operators, Stored tares.** Search narrows
the list as you type; `Add …` opens a small form for a new one. Keeping these current — the right
vehicle number, the right party name — is most of what makes a ticket fast to fill in later, since
Weighing's own dropdowns search this same list.

## Reports and Dashboard

`▦ Reports` lists every saved ticket with a running total; `▩ Dashboard` gives the same day a
faster glance — tickets by hour, today's material split, and a short list of the most recent
tickets. Both read the same saved tickets Weighing writes — nothing here is entered separately.
Bulk printing a register or summary from Reports uses the same print dialog as a single ticket.

## Cameras

`▣ Cameras` shows the site's camera tiles if any are configured. In this build they're a fixed
decorative fixture, not a live feed from real hardware — Settings has nothing to point them at yet.

## If something looks wrong

- **A ticket won't total** — it needs both a tare and a gross weighing before it has a net. Check
  Captured & calculated for which one is still missing.
- **The indicator won't settle to `STABLE`** — wait for the vehicle to stop moving; `Tare`/`Gross`
  are disabled during `MOTION` on purpose, so a moving-vehicle reading never gets saved as real.
- **A saved party/vehicle/material is missing from a dropdown** — add it once from Masters and it's
  available everywhere afterwards, including mid-ticket in Weighing's own dropdowns.
- **Settings won't change** — that pane is read-only until an admin enters the admin password
  (see [AdminSetup.md](AdminSetup.md)). Weighing itself never needs it.
