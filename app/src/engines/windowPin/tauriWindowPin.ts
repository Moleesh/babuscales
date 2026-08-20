import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import type { WindowPinSource } from "./types";

export const createTauriWindowPin = (): WindowPinSource => ({
    setAlwaysOnTop: (pinned) => getCurrentWindow().setAlwaysOnTop(pinned),
    minimize: () => getCurrentWindow().minimize(),
    // See types.ts's own comment on `close` — `.hide()`, not `.close()`, is
    // what actually reaches lib.rs's close-to-tray behaviour from a
    // frontend button click.
    close: () => getCurrentWindow().hide(),
    fillScreen: () => invoke("fill_screen"),
});
