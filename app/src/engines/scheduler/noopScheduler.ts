import type { SchedulerSource } from "./types";

// The memory-adapter/GitHub-Pages build: there is no OS process or task
// scheduler in a browser tab, and nothing launches this build with
// `--daily-summary` in the first place — same "honestly report nothing
// here" shape as @engines/tunnel's/@engines/licensing's own noop sources.
export const createNoopScheduler = (): SchedulerSource => ({
    syncDailySummaryTask: () => Promise.resolve(),
    isHeadlessDailySummary: () => Promise.resolve(false),
    exitApp: () => Promise.resolve(),
});
