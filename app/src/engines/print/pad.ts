// Ported from the mock's `rpad`/`lpad` — fixed-width columns for a
// monospace slip. `slice` on `rpad` guards the same overflow case the mock
// guards: a name longer than the column just gets truncated, not wrapped.
// Shared by every mono renderer (renderMonoSlip.ts, renderReportMonoSlip.ts)
// — the mock defines these once at module scope and every `ticketXx`/
// `reportXx` function reaches for them, so this file is that one place.
export const rpad = (s: string, n: number): string => s.padEnd(n).slice(0, n);
export const lpad = (s: string, n: number): string => s.padStart(n).slice(-n);
