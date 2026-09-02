use tauri::AppHandle;

use crate::error::AppError;

const TASK_NAME: &str = "BabuScales DailySummary";

/// Registers (or removes) a Windows Task Scheduler entry that launches this
/// exe with `--daily-summary` once a day at `time_hm` ("HH:MM", 24h) — the
/// real OS-level wake PLAN §21 previously flagged as missing: before this,
/// the daily summary only ever checked while the app happened to already be
/// open (`App.tsx`'s `DailySummarySync`, a `setInterval` that does nothing
/// once the process exits). Windows-only: `schtasks.exe` doesn't exist
/// elsewhere, and the installer only ships an NSIS build for Windows
/// (`tauri.conf.json`) — a no-op everywhere else rather than an error, so
/// calling this from Settings on a dev machine running another OS is safe.
///
/// Deliberately thin: this only gets the OS to *launch the app* at the
/// right time. What happens next (building and sending the actual summary)
/// stays exactly where PLAN §5 puts all domain logic — TypeScript, not
/// duplicated here — see `is_headless_daily_summary`/`exit_app` below and
/// `App.tsx`'s `runHeadlessDailySummary`.
#[tauri::command]
pub fn sync_daily_summary_task(enabled: bool, time_hm: String) -> Result<(), AppError> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (enabled, time_hm);
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        // schtasks has no update-in-place; /create /f overwrites cleanly,
        // so disable-then-reenable and a plain time change both go through
        // the same delete-or-recreate path with no separate "does it exist
        // yet" branch to get wrong.
        let _ = Command::new("schtasks")
            .args(["/delete", "/f", "/tn", TASK_NAME])
            .output();

        if !enabled {
            return Ok(());
        }

        if !is_valid_hm(&time_hm) {
            return Err(AppError::Message(format!(
                "sync_daily_summary_task: invalid time \"{time_hm}\", expected HH:MM"
            )));
        }

        let exe = std::env::current_exe()?;
        let exe_str = exe.to_string_lossy();
        let status = Command::new("schtasks")
            .args([
                "/create",
                "/f",
                "/sc",
                "DAILY",
                "/tn",
                TASK_NAME,
                "/tr",
                &format!("\"{exe_str}\" --daily-summary"),
                "/st",
                &time_hm,
            ])
            .status()?;

        if !status.success() {
            return Err(AppError::Message(
                "sync_daily_summary_task: schtasks /create failed".into(),
            ));
        }
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn is_valid_hm(s: &str) -> bool {
    let Some((h, m)) = s.split_once(':') else {
        return false;
    };
    matches!(
        (h.parse::<u32>(), m.parse::<u32>()),
        (Ok(h), Ok(m)) if h < 24 && m < 60
    )
}

/// True when this process was launched by the scheduled task (argv carries
/// `--daily-summary`) rather than a normal user double-click. The frontend
/// checks this once at boot (`App.tsx`) to decide whether to run the
/// summary send headlessly and quit, or render the UI as usual.
#[tauri::command]
pub fn is_headless_daily_summary() -> bool {
    std::env::args().any(|arg| arg == "--daily-summary")
}

/// Quits the process — the headless run's last step once the summary send
/// (success or failure, same as the in-app check) has been recorded.
#[tauri::command]
pub fn exit_app(app: AppHandle) {
    app.exit(0);
}
