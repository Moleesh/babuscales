// A print template — persisted as a `config` row (ConfigKind: "Template",
// reserved for exactly this in db/types.ts's CONFIG_KINDS but unused until
// now). Task: "let build print template" — same structure as the Fields
// tab's schema editor (upload/paste → a table of saved rows → edit/delete/
// preview), but for the raw HTML a ticket prints through instead of a field
// schema. `WidthMm`/`HeightMm`/`MarginMm` are what the wizard's second step
// collects and what the preview (TemplatePreviewFrame) renders against —
// nothing outside Settings reads these yet; wiring an actual print job to
// pick one of these instead of the three built-in A4/Thermal/Matrix layouts
// is future work (see settings.printTemplates.hint).
export interface PrintTemplate {
    Id: string;
    Name: string;
    Html: string;
    WidthMm: number;
    HeightMm: number;
    MarginMm: number;
    /** Task: "default templates cannot be deleted" — true for the two seeded `DEFAULT_PRINT_TEMPLATES` rows, false for anything an admin adds themselves. */
    IsDefault: boolean;
}

/** The wizard's working copy — no `Id` until the first save (`usePrintTemplates.saveTemplate` treats a missing `Id` as "insert"). */
export type PrintTemplateDraft = Omit<PrintTemplate, "Id">;

// A4 — the same default the built-in layouts already assume (SlipA4.tsx).
export const DEFAULT_TEMPLATE_DIMS = { WidthMm: 210, HeightMm: 297, MarginMm: 10 };

export const blankTemplateDraft = (): PrintTemplateDraft => ({
    Name: "",
    Html: "",
    ...DEFAULT_TEMPLATE_DIMS,
    IsDefault: false,
});

// Starter content for the (still-empty) templates table — ported from
// weighing v1's own built-in layouts (SlipA4.tsx's markup/CSS, and
// renderMonoSlip.ts's thermal text slip) as plain `{{Token}}` placeholder
// HTML, since a print template here has no live SlipData binding yet (see
// this file's PrintTemplate doc comment — wiring a real print job to one of
// these is future work). `usePrintTemplates` seeds these in once, the first
// time the table is empty, so a fresh install has something to look at
// instead of a blank list; deleting all of them stays deleted rather than
// re-seeding forever (see usePrintTemplates.ts's `hasSeeded` guard).
const A4_SLIP_HTML = `<div style="background:#fffdf7;color:#141414;font-family:sans-serif;font-size:12px;line-height:1.55;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #141414;padding-bottom:8px;">
    <div>
      <div style="font-weight:700;font-size:14px;">{{SiteName}}</div>
      <div style="font-size:10px;">{{SiteAddress}}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;">{{TicketNo}}</div>
      <div style="font-size:10px;">{{Copy}}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;margin:10px 0;font-size:11px;">
    <div><b>Vehicle</b> {{VehicleNo}}</div>
    <div><b>Challan</b> {{ChallanNo}}</div>
    <div><b>Party</b> {{Party}}</div>
    <div><b>Material</b> {{Material}}</div>
    <div><b>Tare at</b> {{TareAt}}</div>
    <div><b>Gross at</b> {{GrossAt}}</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0;text-align:center;">
    <div style="border:1px solid #c9c4b4;border-radius:4px;padding:7px;">TARE<br/><b>{{TareKg}}</b></div>
    <div style="border:1px solid #c9c4b4;border-radius:4px;padding:7px;">GROSS<br/><b>{{GrossKg}}</b></div>
    <div style="border:1px solid #c9c4b4;border-radius:4px;padding:7px;">NET<br/><b>{{NetKg}}</b></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;margin:10px 0;font-size:11px;">
    <div><b>Charge</b> {{Charge}}</div>
    <div><b>Operator</b> {{Operator}}</div>
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:14px;border-top:1px solid #c9c4b4;padding-top:9px;font-size:10px;">
    <span>Printed {{PrintedAt}}</span>
    <span>Signature</span>
  </div>
</div>`;

const THERMAL_SLIP_HTML = `<div style="background:#fffdf7;color:#141414;font-family:monospace;font-size:11px;line-height:1.5;text-align:center;">
  <div style="font-weight:700;">{{SiteName}}</div>
  <div>{{SiteAddress}}</div>
  <div style="border-top:1px dashed #141414;margin:6px 0;"></div>
  <div style="display:flex;justify-content:space-between;text-align:left;"><span>{{TicketNo}}</span><span>{{Copy}}</span></div>
  <div style="text-align:left;">Vehicle {{VehicleNo}}</div>
  <div style="text-align:left;">Party {{Party}}</div>
  <div style="text-align:left;">Material {{Material}}</div>
  <div style="border-top:1px dashed #141414;margin:6px 0;"></div>
  <div style="text-align:left;">Tare {{TareKg}}</div>
  <div style="text-align:left;">Gross {{GrossKg}}</div>
  <div style="text-align:left;">Net {{NetKg}}</div>
  <div style="border-top:1px dashed #141414;margin:6px 0;"></div>
  <div style="text-align:left;">Charge {{Charge}}</div>
  <div style="text-align:left;">Operator {{Operator}}</div>
  <div style="border-top:1px dashed #141414;margin:6px 0;"></div>
</div>`;

export const DEFAULT_PRINT_TEMPLATES: PrintTemplateDraft[] = [
    { Name: "Weighing Slip (A4)", Html: A4_SLIP_HTML, WidthMm: 210, HeightMm: 297, MarginMm: 10, IsDefault: true },
    { Name: "Weighing Receipt (Thermal 80mm)", Html: THERMAL_SLIP_HTML, WidthMm: 80, HeightMm: 150, MarginMm: 3, IsDefault: true },
];
