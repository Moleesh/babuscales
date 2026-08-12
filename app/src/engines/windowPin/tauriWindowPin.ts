import { getCurrentWindow } from "@tauri-apps/api/window";

import type { WindowPinSource } from "./types";

export const createTauriWindowPin = (): WindowPinSource => ({
    setAlwaysOnTop: (pinned) => getCurrentWindow().setAlwaysOnTop(pinned),
});
