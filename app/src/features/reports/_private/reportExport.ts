import { timestampForFilename } from "@constants/timestampForFilename";
import { toCsvBlob, toXlsxBlob } from "@engines/export";
import type { ReportSlipData } from "@engines/print";

const slugifyTitle = (title: string): string =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Same plain Blob-download mechanism as BackupRestoreCard.tsx's
// handleExport — browser-native, works identically in the web demo and
// the real Tauri build, no dialog plugin needed.
const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

const exportFilenameBase = (title: string): string =>
    `babuscales-report-${slugifyTitle(title)}-${timestampForFilename()}`;

// Split out of ReportsScreen (over the line/complexity budget —
// docs/CodingStandards.md) — reuses reportSlipData's own Head/Rows/Title,
// the same data the Print button sends to the slip renderer, so an
// exported file can never drift from what gets printed. Unchanged from
// the inline version it replaces.
export const exportReportCsv = (data: ReportSlipData): void => {
    downloadBlob(toCsvBlob(data.Head, data.Rows), `${exportFilenameBase(data.Title)}.csv`);
};

export const exportReportXlsx = (data: ReportSlipData): void => {
    downloadBlob(toXlsxBlob(data.Title, data.Head, data.Rows), `${exportFilenameBase(data.Title)}.xlsx`);
};
