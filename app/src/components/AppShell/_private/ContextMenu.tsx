import { useTranslation } from "@i18n/useTranslation";

import type { ContextMenuState } from "./useContextMenu";
import styles from "../_styles/ContextMenu.module.css";

export interface ContextMenuProps {
    menu: ContextMenuState;
    onClose: () => void;
}

// `document.execCommand` is deprecated but still the only *synchronous*,
// no-permission-prompt way to run Cut/Copy on the current selection inside
// a webview — the async Clipboard API (`navigator.clipboard.writeText`)
// works too but adds a permission round-trip for no benefit here, since
// this only ever runs against the field the user just right-clicked.
// Paste has no execCommand equivalent Chromium allows from script anymore,
// so it goes through the async Clipboard API instead (readText), which
// Tauri's CSP/webview already grants this origin.
const runCut = () => document.execCommand("cut");
const runCopy = () => document.execCommand("copy");

// `.selectionStart`/`.selectionEnd` throw `InvalidStateError` in Chromium
// for input types that don't support a text selection range (number, email,
// date, color, etc. — see the WHATWG "does not apply" list) — only
// text-like input types and `<textarea>` (always) support it. Guard every
// read behind this so right-clicking a number/email field doesn't crash
// the whole context menu.
const TEXT_LIKE_INPUT_TYPES = new Set(["text", "search", "tel", "url", "password"]);
const supportsSelectionRange = (field: HTMLInputElement | HTMLTextAreaElement): boolean =>
    field instanceof window.HTMLTextAreaElement || TEXT_LIKE_INPUT_TYPES.has(field.type);

// For an unsupported input type there's no real selection to speak of —
// treated as "nothing selected", which disables Cut/Copy (there'd be
// nothing to act on) and makes Paste replace the whole value, the same
// full-value-select fallback a native number/email field's own Paste does.
const getSelection = (field: HTMLInputElement | HTMLTextAreaElement): { start: number; end: number } => {
    if (!supportsSelectionRange(field)) return { start: 0, end: field.value.length };
    return {
        start: field.selectionStart ?? field.value.length,
        end: field.selectionEnd ?? field.value.length,
    };
};

const runPaste = async (target: HTMLInputElement | HTMLTextAreaElement) => {
    try {
        const text = await navigator.clipboard.readText();
        const { start, end } = getSelection(target);
        const next = target.value.slice(0, start) + text + target.value.slice(end);
        // Native setter, not `target.value =` directly — React's own value
        // setter is patched over the native one, so a plain assignment here
        // wouldn't fire the field's `input` event and the controlled value
        // would silently desync from what's now on screen. Pulled from the
        // right prototype for the actual tag — an `<input>`'s setter isn't
        // on `HTMLTextAreaElement.prototype` and vice versa.
        const proto = target instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement : window.HTMLInputElement;
        // eslint-disable-next-line @typescript-eslint/unbound-method -- accessor pulled off the prototype's descriptor, not a bound method; the explicit `.call(target, ...)` below supplies `this` itself.
        const setter = Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set;
        setter?.call(target, next);
        target.dispatchEvent(new Event("input", { bubbles: true }));
        if (supportsSelectionRange(target)) target.setSelectionRange(start + text.length, start + text.length);
    } catch {
        // Clipboard read denied/empty — nothing to paste, fail silently
        // rather than surfacing a dialog for what's a minor, retryable slip.
    }
};

// A small themed replacement for the OS's own right-click menu — desktop
// view needs copy/cut/paste, not the rest — this is a desktop app, not a
// browser tab, so Chromium's
// Back/Refresh/Save-as/Inspect/"Send tab to your devices" menu was pure
// leftover-browser chrome. Only rendered over actual text fields
// (useContextMenu.ts's EDITABLE_SELECTOR); right-clicking anywhere else now
// just does nothing, which is the correct "no others" behaviour.
export const ContextMenu = ({ menu, onClose }: ContextMenuProps) => {
    const { t } = useTranslation();
    const field = menu.target as HTMLInputElement | HTMLTextAreaElement;
    const selection = getSelection(field);
    // Unsupported types (number/email/...) report a fake "whole value
    // selected" range from getSelection so Paste can replace-all, but there
    // is no real browser text-selection for Cut/Copy to act on there —
    // execCommand("cut"/"copy") would silently no-op. Gate on
    // supportsSelectionRange too so those buttons render disabled instead of
    // looking clickable and doing nothing.
    const hasSelection = supportsSelectionRange(field) && selection.start !== selection.end;

    const act = (run: () => void) => {
        run();
        onClose();
    };

    return (
        <div
            className={styles.menu}
            data-context-menu
            style={{ left: menu.x, top: menu.y }}
            role="menu"
            aria-label={t("contextMenu.label")}
        >
            <button type="button" role="menuitem" disabled={!hasSelection} onClick={() => act(runCut)}>
                {t("contextMenu.cut")}
            </button>
            <button type="button" role="menuitem" disabled={!hasSelection} onClick={() => act(runCopy)}>
                {t("contextMenu.copy")}
            </button>
            <button type="button" role="menuitem" onClick={() => act(() => void runPaste(field))}>
                {t("contextMenu.paste")}
            </button>
        </div>
    );
};
