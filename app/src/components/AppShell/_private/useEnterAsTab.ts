import { useEffect } from "react";

const FOCUSABLE =
    'input:not([readonly]):not([disabled]):not([type="file"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])';

const isVisible = (el: HTMLElement): boolean =>
    Boolean(el.offsetParent) || el.getClientRects().length > 0;

// A modal/wizard/popover renders its own `[data-enter-scope]` container,
// later in the DOM than the shell's — the last one present is the one the
// user can currently see, so it wins. Falls back to the whole document.
const resolveScope = (): ParentNode => {
    const scopes = document.querySelectorAll<HTMLElement>("[data-enter-scope]");
    return scopes[scopes.length - 1] ?? document.body;
};

// Enter walks every field and button on the visible screen or open dialog,
// exactly like Tab — including buttons, which Tab does not always reach
// consistently across browsers. Shift+Enter reverses. Space still presses a
// focused button; Enter here only ever moves focus (PLAN §13).
export const useEnterAsTab = (): void => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target;
            if (target instanceof HTMLTextAreaElement) return; // keeps its own literal newline

            const scope = resolveScope();
            const list = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
                isVisible,
            );
            if (!list.length) return;

            const current = list.indexOf(document.activeElement as HTMLElement);
            const nextIndex = (current + (event.shiftKey ? -1 : 1) + list.length) % list.length;
            const next = list[nextIndex];
            if (!next) return;

            event.preventDefault();
            next.focus();
            if (next instanceof HTMLInputElement) next.select();
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);
};
