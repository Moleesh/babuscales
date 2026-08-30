; Deletes the "BabuScales DailySummary" Windows Task Scheduler entry
; (registered by sync_daily_summary_task, commands/scheduler.rs, when the
; operator turns on Settings' daily-summary send) as part of the generated
; uninstaller. Silently no-ops if the task was never created.
!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec 'schtasks /delete /f /tn "BabuScales DailySummary"'
!macroend
