// Same "what counts as a focusable field" definition as
// useEnterAsTab.ts's own `FOCUSABLE` — kept as its own small copy here
// rather than importing across features' `_private` folders.
const FOCUSABLE =
    'input:not([readonly]):not([disabled]):not([type="file"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]):not([tabindex="-1"])';

const isVisible = (el: HTMLElement): boolean =>
    Boolean(el.offsetParent) || el.getClientRects().length > 0;

// Task: "on close of print dialog box the ticket need to reset to new
// ticket, focusing on the first field in the list same for new ticket" —
// used by both the "New ticket" button and the print-modal's onClose, right
// after `ticket.startNew()` resets the form. Deferred one frame (same
// staleness reasoning as Capture→Save/Save→Print in ActionsCard.tsx/
// WeighingScreen.tsx): `startNew` dispatches a reset, but React hasn't
// re-rendered the cleared fields yet at the point this runs, so querying
// the DOM synchronously could still find the *previous* ticket's fields (or
// none at all, mid-clear).
export const focusFirstTicketField = (): void => {
    requestAnimationFrame(() => {
        const scope = document.getElementById("ticketFieldsList");
        if (!scope) return;
        const first = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).find(isVisible);
        if (!first) return;
        // Task: "when focusing the first field after print make sure to
        // scroll to top" — the operator may have scrolled the ticket-fields
        // list (or the page) down while filling the previous ticket; focus
        // alone only scrolls the minimum needed to reveal the field, which
        // can leave the screen mid-scroll instead of back at the top where a
        // fresh ticket should start. `focus()`'s own default scroll runs
        // first, then this forces both the window and the scrollable list
        // itself back to 0.
        first.focus();
        window.scrollTo({ top: 0 });
        scope.scrollTo({ top: 0 });
        if (first instanceof HTMLInputElement) first.select();
    });
};
