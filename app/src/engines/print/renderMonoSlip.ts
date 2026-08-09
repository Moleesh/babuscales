import type { SlipData } from "./types";

// Ported from the mock's `rpad`/`lpad` — fixed-width columns for a
// monospace slip. `slice` on `rpad` guards the same overflow case the mock
// guards: a name longer than the column just gets truncated, not wrapped.
const rpad = (s: string, n: number): string => s.padEnd(n).slice(0, n);
const lpad = (s: string, n: number): string => s.padStart(n).slice(-n);

// Ported from the mock's `ticketMx` — a 40-column dot-matrix slip.
export const renderMatrixSlip = (p: SlipData): string =>
    "+--------------------------------------+\n" +
    "|  SRI LAKSHMI BLUE METALS  NAGERCOIL  |\n" +
    "+--------------------------------------+\n" +
    ` TICKET  ${rpad(p.TicketNo, 12)} ${lpad(p.Copy || "ORIGINAL", 16)}\n` +
    ` VEHICLE ${rpad(p.VehicleNo, 29)}\n` +
    ` PARTY   ${rpad(p.Party, 29)}\n` +
    ` MATERIAL${rpad(p.Material, 29)}\n` +
    ` CHALLAN ${rpad(p.ChallanNo, 29)}\n` +
    "----------------------------------------\n" +
    ` TARE   ${lpad(p.TareKg, 10)} KG  ${rpad(p.TareAt.slice(0, 12), 12)}\n` +
    ` GROSS  ${lpad(p.GrossKg, 10)} KG  ${rpad(p.GrossAt.slice(0, 12), 12)}\n` +
    ` NET    ${lpad(p.NetKg, 10)} KG\n` +
    "----------------------------------------\n" +
    ` CHARGE ${lpad(p.Charge, 12)}\n` +
    ` OPERATOR ${rpad(p.Operator, 20)}\n` +
    "========================================";

// Ported from the mock's `ticketTh` — a narrow 30-column thermal-roll slip.
export const renderThermalSlip = (p: SlipData): string =>
    "   SRI LAKSHMI BLUE METALS\n      Nagercoil  Bridge 1\n" +
    "------------------------------\n" +
    ` ${rpad(p.TicketNo, 14)}${lpad(p.Copy || "ORIGINAL", 15)}\n` +
    ` Vehicle  ${rpad(p.VehicleNo, 20)}\n Party    ${rpad(p.Party, 20)}\n Material ${rpad(p.Material, 20)}\n` +
    "------------------------------\n" +
    ` Tare     ${lpad(p.TareKg, 12)} kg\n Gross    ${lpad(p.GrossKg, 12)} kg\n NET      ${lpad(p.NetKg, 12)} kg\n` +
    "------------------------------\n" +
    ` Charge   ${lpad(p.Charge, 12)}\n Operator ${rpad(p.Operator, 12)}\n\n` +
    `      [ QR ]  ${p.TicketNo}\n------------------------------`;
