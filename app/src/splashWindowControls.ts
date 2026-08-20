import { createWindowPinSource } from "@engines/windowPin/createWindowPinSource";

// Wires index.html's own splash-screen pin/close buttons directly to the
// Tauri window, and fires the fill-screen + pin transition immediately on
// module load — so the window is already full-screen and pinned while the
// splash is still showing, not only once Shell (AppShell's own pin/close
// pair) renders. The splash lives outside React's tree entirely (index.html's
// own comment on why), so this is
// plain DOM wiring, same shape as ./disableNumberInputScroll.ts — imported
// for its side effect only, and it must run before App.tsx's usePinToggle
// reads `#app-splash-pin`'s `aria-pressed` as the hand-off state once React
// mounts. A no-op outside the desktop build (createWindowPinSource's own
// noop branch), so the buttons are inert (but harmless) in the browser
// preview/GitHub Pages build.
const windowPin = createWindowPinSource();

void windowPin.fillScreen();
void windowPin.setAlwaysOnTop(true);

const pinBtn = document.getElementById("app-splash-pin");
const closeBtn = document.getElementById("app-splash-close");

pinBtn?.addEventListener("click", () => {
    const pinned = pinBtn.getAttribute("aria-pressed") !== "true";
    pinBtn.setAttribute("aria-pressed", String(pinned));
    void windowPin.setAlwaysOnTop(pinned);
});
closeBtn?.addEventListener("click", () => void windowPin.close());
