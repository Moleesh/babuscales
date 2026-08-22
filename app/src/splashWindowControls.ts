import { createWindowPinSource } from "@engines/windowPin/createWindowPinSource";

// Wires index.html's own splash-screen minimize/close buttons directly to
// the Tauri window, and pins + fills the screen the moment the splash
// itself shows — tauri.conf.json's own `alwaysOnTop: false` is what the
// native window actually opens as, so there's a brief, genuinely
// small/unpinned window while this script and the webview are still
// starting up, then this module runs and takes it to its real default
// (pinned, full screen) right as the loading screen paints, rather than
// waiting for React/App.tsx to mount. App.tsx's own `usePinToggle` picks
// up from here — its initial `pinned: true` state matches what's already
// been applied here, and it only actually calls `setAlwaysOnTop`/
// `fillScreen` again on a later, real toggle click (see its own comment).
// Minimize/Close here are the same pair AppShell's own top bar offers once
// React mounts — no pin toggle on the splash itself, matching that pin/
// unpin from here on is AppShell's job, not the splash's. The splash lives
// outside React's tree entirely (index.html's own comment on why), so this
// is plain DOM wiring, same shape as ./disableNumberInputScroll.ts —
// imported for its side effect only. A no-op outside the desktop build
// (createWindowPinSource's own noop branch), so this is inert (but
// harmless) in the browser preview/GitHub Pages build.
const windowPin = createWindowPinSource();

void windowPin.setAlwaysOnTop(true);
void windowPin.fillScreen();

const minimizeBtn = document.getElementById("app-splash-minimize");
const closeBtn = document.getElementById("app-splash-close");

minimizeBtn?.addEventListener("click", () => void windowPin.minimize());
closeBtn?.addEventListener("click", () => void windowPin.close());

// Splash-only stand-in for AppShell's own useContextMenu (task: "right
// click works there") — that hook only mounts once React does, so the
// native Chromium context menu ("Inspect", "View source", etc.) still
// showed on the splash until then. No editable fields exist on the splash
// (nothing for a themed Cut/Copy/Paste menu to attach to, unlike
// useContextMenu's real one), so this just suppresses it outright.
document.addEventListener("contextmenu", (event) => {
    if (document.getElementById("app-splash")) event.preventDefault();
});

// Splash-only stand-in for CustomCursor (task: "the minimize and close icon
// on the loading screen is not following the cursor theme") — the real one
// (CustomCursor.tsx) only mounts once React does, so until then the splash's
// minimize/close pair showed the native OS cursor. Same ring+dot look and
// rAF-transform approach, just plain DOM (base.css's own `#app-splash-cursor*`
// rules carry the styling). Self-stops the moment App.tsx removes #app-splash
// (index.html's own comment on when that happens) so it never runs alongside
// the real CustomCursor.
const splash = document.getElementById("app-splash");
if (splash) {
    const cursorEl = document.createElement("div");
    cursorEl.id = "app-splash-cursor";
    cursorEl.setAttribute("aria-hidden", "true");
    cursorEl.innerHTML = '<span id="app-splash-cursor-ring"></span><span id="app-splash-cursor-dot"></span>';
    splash.appendChild(cursorEl);

    let x = 0;
    let y = 0;
    let raf = 0;
    const onMove = (event: MouseEvent) => {
        x = event.clientX;
        y = event.clientY;
    };
    const onOver = (event: MouseEvent) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        cursorEl.classList.toggle("hover", target?.closest(".iconbtn") != null);
    };
    const paint = () => {
        cursorEl.style.transform = `translate(${x}px, ${y}px)`;
        raf = requestAnimationFrame(paint);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(paint);

    const stop = new MutationObserver(() => {
        if (document.getElementById("app-splash")) return;
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseover", onOver);
        stop.disconnect();
    });
    stop.observe(document.body, { childList: true });
}
