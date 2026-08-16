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
const runPaste = async (target: HTMLInputElement | HTMLTextAreaElement) => {
    try {
        const text = await navigator.clipboard.readText();
        const start = target.selectionStart ?? target.value.length;
        const end = target.selectionEnd ?? target.value.length;
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
        target.setSelectionRange(start + text.length, start + text.length);
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
    const hasSelection = field.selectionStart !== field.selectionEnd;

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
