import { lpad, rpad } from "./pad";
import type { SlipData } from "./types";

// Ported from the mock's `p.chg.replace("₹ ", "Rs.")` — a dot-matrix/thermal
// driver's fixed character set can't be trusted with ₹, unlike the A4 slip
// (real text, a real browser font).
const asciiMoney = (s: string): string => s.replace("₹ ", "Rs.");

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
    ` CHARGE ${lpad(asciiMoney(p.Charge), 12)}\n` +
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
    ` Charge   ${lpad(asciiMoney(p.Charge), 12)}\n Operator ${rpad(p.Operator, 12)}\n\n` +
    `      [ QR ]  ${p.TicketNo}\n------------------------------`;
