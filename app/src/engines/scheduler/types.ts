// PLAN §21's "true OS-level scheduler for the daily summary" gap — the
// Windows Task Scheduler entry is what actually wakes the app at
// `DailySummary.Time` even if it's closed (Rust:
// `src-tauri/src/commands/scheduler.rs`'s `sync_daily_summary_task`); this
// module is a thin 1:1 wrapper over those Tauri commands, same shape as
// `@engines/licensing`/`@engines/tunnel`. Desktop-only for the same reason
// those are: there is no OS task scheduler to register against in a
// browser tab, so the memory/GitHub-Pages build gets a no-op source.
export interface SchedulerSource {
    /** Creates/updates (or removes, when `enabled` is false) the OS task that launches this app with `--daily-summary` at `timeHm` ("HH:MM", 24h) every day. */
    syncDailySummaryTask: (enabled: boolean, timeHm: string) => Promise<void>;
    /** True when this process was launched by that OS task rather than a normal user open. */
    isHeadlessDailySummary: () => Promise<boolean>;
    /** Quits the process — the last step of a headless run once the summary send has been recorded. */
    exitApp: () => Promise<void>;
}
