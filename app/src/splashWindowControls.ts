import { createWindowPinSource } from "@engines/windowPin/createWindowPinSource";

// Wires index.html's own splash-screen minimize/close buttons directly to
// the Tauri window. The window opens at its configured 1280×800 size,
// already pinned (tauri.conf.json's own `alwaysOnTop: true`) — this used to
// also call `fillScreen()`/`setAlwaysOnTop(true)` here to grow the window to
// fill the monitor the moment the splash showed, but that meant the
// operator never actually saw the app open at its normal size and position;
// it was already full-screen before the first frame painted. Minimize/Close
// here are the same pair AppShell's own top bar offers once React mounts —
// no pin toggle on the splash any more, matching that the splash itself no
// longer changes the pin state on its own. The splash lives outside React's
// tree entirely (index.html's own comment on why), so this is plain DOM
// wiring, same shape as ./disableNumberInputScroll.ts — imported for its
// side effect only. A no-op outside the desktop build (createWindowPinSource's
// own noop branch), so the buttons are inert (but harmless) in the browser
// preview/GitHub Pages build.
const windowPin = createWindowPinSource();

const minimizeBtn = document.getElementById("app-splash-minimize");
const closeBtn = document.getElementById("app-splash-close");

minimizeBtn?.addEventListener("click", () => void windowPin.minimize());
closeBtn?.addEventListener("click", () => void windowPin.close());
