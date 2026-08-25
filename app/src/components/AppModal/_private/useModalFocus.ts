import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Focus management for `AppModal`, pulled out of the component so it reads
// as markup rather than a focus state machine (docs/CodingStandards.md §1).
// On open, moves focus into the dialog so the Escape handler — which relies
// on the keydown bubbling from a focused descendant — actually receives
// events, and restores focus to whatever had it beforehand once the dialog
// closes. `onTabKeyDown` is a basic focus trap: Tab/Shift+Tab wrap within
// the dialog's own focusable elements instead of walking out to the page.
export const useModalFocus = (open: boolean) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;

        previouslyFocused.current = document.activeElement as HTMLElement | null;
        // Task: "reprint should autom focus to the end of the input" — an
        // `autoFocus` field inside the dialog (ReprintLookupModal's ticket
        // input) grabs focus during React's commit phase, before this
        // passive effect ever runs; unconditionally moving focus to the
        // sheet here was stealing it right back off that field (and losing
        // its own onFocus-set cursor position with it) the instant the
        // dialog finished mounting. Only take over when nothing inside the
        // sheet already has focus on its own.
        if (!sheetRef.current?.contains(document.activeElement)) {
            sheetRef.current?.focus();
        }

        return () => {
            previouslyFocused.current?.focus();
        };
    }, [open]);

    const trapTab = (event: ReactKeyboardEvent) => {
        if (event.key !== "Tab" || !sheetRef.current) return;

        const focusable = Array.from(
            sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last?.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first?.focus();
        }
    };

    return { sheetRef, trapTab };
};
