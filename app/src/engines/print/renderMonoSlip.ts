import { lpad, rpad } from "./pad";
import type { SlipData } from "./types";

// Ported from the mock's `p.chg.replace("₹ ", "Rs.")` — a dot-matrix/thermal
// driver's fixed character set can't be trusted with ₹, unlike the A4 slip
// (real text, a real browser font).
const asciiMoney = (s: string): string => s.replace("₹ ", "Rs.");

// Task #46's itemised per-load breakdown, shared by both mono renderers
// below — each just picks its own column width. Empty string (no line at
// all) when there's nothing to itemise, so a non-multi-gross ticket's
// output is unchanged from before this existed.
const matrixLoadLines = (loads: SlipData["GrossLoads"]): string =>
    loads.length > 1
        ? loads.map((l, i) => ` LOAD ${i + 1}  ${lpad(l.Kg, 10)} KG  ${rpad(l.At.slice(0, 12), 12)}\n`).join("")
        : "";
const thermalLoadLines = (loads: SlipData["GrossLoads"]): string =>
    loads.length > 1 ? loads.map((l, i) => ` Load ${i + 1}  ${lpad(l.Kg, 12)} kg\n`).join("") : "";

// Ported from the mock's `ticketMx` — a 40-column dot-matrix slip.
export const renderMatrixSlip = (p: SlipData): string =>
    "+--------------------------------------+\n" +
    "|         BABULENS ENTERPRISE          |\n" +
    "|         NAGERCOIL 9789597007         |\n" +
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
    matrixLoadLines(p.GrossLoads) +
    "----------------------------------------\n" +
    ` CHARGE ${lpad(asciiMoney(p.Charge), 12)}\n` +
    ` OPERATOR ${rpad(p.Operator, 20)}\n` +
    "========================================";

// Ported from the mock's `ticketTh` — a narrow 30-column thermal-roll slip.
// The mock's own `[ QR ]  {no}` line was always a placeholder (a thermal
// roll driven by plain text, as this renderer's return type is, has no way
// to emit a bitmap — there's no ESC/POS raster driver in this codebase,
// app/README.md known gap). Now that the URL it stands in for is real
// (@engines/verification, task #33), printing the actual address is more
// useful than a graphic this pipeline can't draw; the line is dropped
// entirely rather than kept as a placeholder when there's nothing real to
// print (feature off, or the ticket has no VerifyUrl yet).
export const renderThermalSlip = (p: SlipData): string =>
    "     BABULENS ENTERPRISE\n      Nagercoil  9789597007\n" +
    "------------------------------\n" +
    ` ${rpad(p.TicketNo, 14)}${lpad(p.Copy || "ORIGINAL", 15)}\n` +
    ` Vehicle  ${rpad(p.VehicleNo, 20)}\n Party    ${rpad(p.Party, 20)}\n Material ${rpad(p.Material, 20)}\n` +
    "------------------------------\n" +
    ` Tare     ${lpad(p.TareKg, 12)} kg\n Gross    ${lpad(p.GrossKg, 12)} kg\n NET      ${lpad(p.NetKg, 12)} kg\n` +
    thermalLoadLines(p.GrossLoads) +
    "------------------------------\n" +
    ` Charge   ${lpad(asciiMoney(p.Charge), 12)}\n Operator ${rpad(p.Operator, 12)}\n` +
    (p.VerifyUrl ? `\n Verify   ${p.VerifyUrl}\n` : "\n") +
    "------------------------------";
