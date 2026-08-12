import { invoke } from "@tauri-apps/api/core";

import type { SchedulerSource } from "./types";

export const createTauriScheduler = (): SchedulerSource => ({
    syncDailySummaryTask: (enabled, timeHm) =>
        invoke<void>("sync_daily_summary_task", { enabled, timeHm }),
    isHeadlessDailySummary: () => invoke<boolean>("is_headless_daily_summary"),
    exitApp: () => invoke<void>("exit_app"),
});
