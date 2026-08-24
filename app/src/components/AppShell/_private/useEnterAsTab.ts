import { useEffect } from "react";

// `[tabindex="-1"]` is excluded deliberately — a SearchableDropdown's popover
// buttons (search results, "Add new") are that: reachable by mouse, but not
// part of the field-to-field walk. Without this, Enter could land on one of
// those buttons and then lose focus entirely the instant its popover closes
// on blur, dropping focus to <body> mid-walk.
const FOCUSABLE =
    'input:not([readonly]):not([disabled]):not([type="file"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]):not([tabindex="-1"])';

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
// focused button; Enter here only ever moves focus.
export const useEnterAsTab = (): void => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target;
            if (target instanceof HTMLTextAreaElement) return; // keeps its own literal newline
            // Mock's own bailout (`e.target === $("opEdit") || e.target === $("admPw")`) —
            // a top-bar inline-edit chip (OperatorChip) isn't part of any screen's walk at
            // all; without this, an Enter meant to commit it gets caught by the walker
            // instead, force-focusing something in the main content area (`current` comes
            // back -1 since the chip's input isn't in `scope`'s list) before the chip's own
            // handler runs.
            if (target instanceof HTMLElement && target.closest("[data-enter-skip]")) return;
            // A focused <button> gets the browser's own Enter-activates-it
            // behavior instead of being walked past — Enter used to always
            // move focus off a button without ever pressing it (task: "enter
            // on buttons is not working"). Space still presses it too; this
            // just stops Enter from being swallowed by the walker first.
            if (target instanceof HTMLButtonElement) return;

            const scope = resolveScope();
            // `data-enter-skip` used to only bail when the *source* element sat
            // inside a skip container (the check above) — it never stopped a
            // skip-marked element from being picked as the *destination*, so
            // Enter from a ManualCalcBox's Tare input still landed on the
            // Tare/Gross SegmentedControl right after it (task: "enter from
            // tare goes directly to tare tab switch it should go to capture").
            // Excluding skip-marked elements from the walk list entirely fixes
            // both directions with one change.
            const list = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
                (el) => isVisible(el) && !el.closest("[data-enter-skip]"),
            );
            if (!list.length) return;

            // `list.indexOf` returns -1 when nothing in the walk is focused
            // (e.g. focus is on <body>). Forward Enter from -1 already lands
            // correctly on index 0 via `(-1 + 1 + length) % length`. But
            // Shift+Enter needs a different effective starting point to land
            // on the true last element the same way: `(-1 - 1 + length) %
            // length` = `length - 2`, one short. Treating "nothing focused"
            // as "just past the last index" (i.e. `current = length`) only
            // for the backward case makes `length - 1 + length) % length` =
            // `length - 1`, the actual last element — while leaving the
            // forward case's already-correct `-1` alone.
            const current = list.indexOf(document.activeElement as HTMLElement);
            const base = current === -1 && event.shiftKey ? list.length : current;
            const nextIndex = (base + (event.shiftKey ? -1 : 1) + list.length) % list.length;
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
