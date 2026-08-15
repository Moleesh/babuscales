import { useLayoutEffect, useState } from "react";

// Matches CustomCursor's own TEXT_SELECTOR (useCursorTracking.ts) — the same
// "what counts as an edit field" list, reused here so both agree on where
// text interaction (and now copy/cut/paste) is even possible.
const EDITABLE_SELECTOR = [
    'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([readonly]):not(:disabled)',
    "textarea:not([readonly]):not(:disabled)",
    '[contenteditable="true"]',
].join(",");

export interface ContextMenuState {
    x: number;
    y: number;
    target: HTMLElement;
}

// Suppresses the native Chromium context menu app-wide (task: "remove
// rightclick in destop view, i can have copy cut paste no need others") —
// this is a desktop app, not a web page, so "View source"/"Inspect"/"Save
// as"/"Send tab to your devices" etc. are all dead weight that don't apply
// and look like a browser leaking through. The one thing worth keeping is
// Cut/Copy/Paste over actual text fields, which ContextMenu.tsx renders as
// a small themed menu instead of the OS one — see AppShell.tsx for where
// it's mounted (once, app-wide, matching how CustomCursor is mounted).
export const useContextMenu = () => {
    const [menu, setMenu] = useState<ContextMenuState | null>(null);

    useLayoutEffect(() => {
        const onContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            const target = event.target instanceof Element ? event.target.closest(EDITABLE_SELECTOR) : null;
            setMenu(target instanceof HTMLElement ? { x: event.clientX, y: event.clientY, target } : null);
        };
        // Any other interaction dismisses an open menu — same "outside
        // click closes it" posture as Select/DatePicker's own popovers. A
        // mousedown *inside* the menu itself is skipped here: it fires
        // before the button's own `click` (mousedown → click), so closing
        // on it unconditionally would unmount the button out from under
        // its own click before the Cut/Copy/Paste action ever ran.
        // ContextMenu.tsx marks its root with `data-context-menu`.
        const onDismiss = (event: Event) => {
            if (event.target instanceof Element && event.target.closest("[data-context-menu]")) return;
            setMenu(null);
        };
        document.addEventListener("contextmenu", onContextMenu);
        window.addEventListener("mousedown", onDismiss);
        window.addEventListener("blur", onDismiss);
        window.addEventListener("keydown", onDismiss);
        return () => {
            document.removeEventListener("contextmenu", onContextMenu);
            window.removeEventListener("mousedown", onDismiss);
            window.removeEventListener("blur", onDismiss);
            window.removeEventListener("keydown", onDismiss);
        };
    }, []);

    return { menu, close: () => setMenu(null) };
};
