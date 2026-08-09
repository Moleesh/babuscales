import type { Localized } from "./types";

// The manual, one topic per tab (PLAN §11). Field names are PascalCase
// because this is what a `config` row's body looks like once help content
// actually lives there — this file is the bundled fallback a fresh install
// starts with, not a permanent source. Only `en` is authored so far;
// `resolveLocalized` falls back to it for any language with no `ta` yet.
export interface HelpPoint {
    Term: Localized;
    Detail: Localized;
}

export interface HelpTopic {
    /** Tab key this topic answers "?" for — "weigh", "dash", etc. */
    Scope: string;
    Heading: Localized;
    Lead: Localized;
    Points: HelpPoint[];
    Tip: Localized;
}

const en = (text: string): Localized => ({ en: text });
const point = (term: string, detail: string): HelpPoint => ({ Term: en(term), Detail: en(detail) });

export const DEFAULT_HELP_TOPICS: Record<string, HelpTopic> = {
    weigh: {
        Scope: "weigh",
        Heading: en("Weighing"),
        Lead: en("One deck, many lorries in flight."),
        Points: [
            point(
                "Tare or Gross",
                "you say which weight this is. The rule only sets which one is offered first.",
            ),
            point(
                "Save",
                "with one weight parks the ticket and frees the deck immediately. The next lorry never waits for the last one to come back.",
            ),
            point(
                "The strip",
                "across the top is every ticket waiting for its second weight. Click one to pick it up.",
            ),
            point(
                "Vehicle No",
                "offers what is already known about that lorry — a half-finished ticket, a stored tare, the last load.",
            ),
            point(
                "Enter",
                "moves to the next field, and keeps moving through the buttons. Space presses a button.",
            ),
        ],
        Tip: en(
            "Nothing reaches the ledger until Save. A lorry that drives off before the first capture leaves no row behind.",
        ),
    },
    dash: {
        Scope: "dash",
        Heading: en("Dashboard"),
        Lead: en("The shift at a glance."),
        Points: [
            point("Waiting", "are lorries that took a first weight and have not come back."),
            point("Tickets by hour", "shows the rush. The lit bar is the hour you are in."),
            point("Material split", "is net tonnes, not ticket count."),
        ],
        Tip: en(
            "Every number here is a query over the same ledger Reports searches. There is no second copy to fall out of date.",
        ),
    },
    cameras: {
        Scope: "cameras",
        Heading: en("Cameras"),
        Lead: en("Photographic evidence attached to the weight."),
        Points: [
            point("Sources", "USB, IP, RTSP and ONVIF."),
            point(
                "Burn-in",
                "ticket number, weight and time are written into the image, so a cropped screenshot still proves itself.",
            ),
            point(
                "Auto-capture",
                "fires on the same stable signal the weight uses — the photo and the weight are the same instant.",
            ),
        ],
        Tip: en("Images are content-addressed and stored once."),
    },
    reports: {
        Scope: "reports",
        Heading: en("Reports"),
        Lead: en("One tab. A ticket list is a report that has not been grouped yet."),
        Points: [
            point(
                "Tickets",
                "every row, searchable. Resume a half-finished one or reprint a finished one from the row.",
            ),
            point("Summary", "the same rows grouped by material, party, vehicle or transporter."),
            point(
                "Cancel",
                "never deletes. The row stays, struck through, with the reason on the audit trail.",
            ),
        ],
        Tip: en(
            "There is no separate Tickets tab because there was never a second set of data — only a second way of looking at the same one.",
        ),
    },
    masters: {
        Scope: "masters",
        Heading: en("Masters"),
        Lead: en("The lists the weighing fields search."),
        Points: [
            point(
                "Parties, Materials, Vehicles",
                "each one is what a search field on the Weighing tab looks up.",
            ),
            point(
                "Add as you go",
                "typing something new offers to add it here, so the master grows from real work.",
            ),
            point(
                "Stored tares",
                "let a known lorry skip the empty weighment when strict tare is off.",
            ),
        ],
        Tip: en(
            "Strict tare ignores stored tares entirely. That is a per-site rule, not a per-ticket decision.",
        ),
    },
    settings: {
        Scope: "settings",
        Heading: en("Settings"),
        Lead: en("Everything configurable, in the database, behind the admin password."),
        Points: [
            point(
                "Admin",
                "the lock in the top bar. Unlock once and Settings stays editable for ten minutes.",
            ),
            point(
                "Fields",
                "the schema is uploaded, not coded. Each field carries its own labels, so a new field arrives already translated.",
            ),
            point(
                "Language packs",
                "are JSON rows too. English is the fallback; a pack only carries what it overrides.",
            ),
        ],
        Tip: en(
            "No setting is a file. A config file is the one thing that never gets backed up and never reaches the second terminal.",
        ),
    },
};
