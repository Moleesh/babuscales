import { formatDateTimeInFmt } from "@constants/numberFormat";

/** Formats an ISO timestamp in the given locale/date/time format, or "—" when absent. */
export const formatStamp = (
    iso: string | undefined,
    lang: string,
    dateFmt: string,
    timeFmt: "24" | "12",
): string => (iso ? formatDateTimeInFmt(iso, lang, dateFmt, timeFmt) : "—");
