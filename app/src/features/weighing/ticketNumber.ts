// Formatting only — the number itself comes from `DataPort.allocateDocSeq`,
// called once at first Save (PLAN §6.1 — "at close, never at draft"). The
// prefix/width belong to a numbering Format config once Settings exists
// (app/README.md known gap); these are the mock's own defaults meanwhile.
const PREFIX = "TKT-";
const WIDTH = 4;

export const formatTicketNo = (docSeq: number | null): string =>
    docSeq === null ? "Draft" : `${PREFIX}${String(docSeq).padStart(WIDTH, "0")}`;
