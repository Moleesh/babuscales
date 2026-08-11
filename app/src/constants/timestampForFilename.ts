// `YYYYMMDD-HHMM`, local time — used everywhere this app names a file after
// the moment it was made (backups, pre-import safety snapshots, exported
// reports). Previously duplicated three times (settings/_private/
// BackupRestoreCard.tsx, settings/_private/LegacyImportCard.tsx via that
// module, and reports/ReportsScreen.tsx with its own copy — the latter
// explicitly because `_private/` is unreachable from outside its feature).
// One shared copy here, reachable from anywhere, resolves the duplication
// without crossing that boundary.
export const timestampForFilename = (): string => {
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
};
