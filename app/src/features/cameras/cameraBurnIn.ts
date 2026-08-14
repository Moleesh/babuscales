import { formatWeightKg } from "@constants/numberFormat";
import type { Capture } from "@db/ticketBody";
import { formatTicketNo } from "@features/weighing";

// Ported from the mock's `renderCams`: `state.no + " · " + fmt(last.kg) +
// " kg · " + fTime(last.at)` — the text a real system would burn into the
// frame at capture time (PLAN §16's "overlay stamp"), shown here as plain
// text over the decorative tile since there is no real frame to burn it
// into (cameraFixtures.ts's own comment).
// Deliberately fixed-kg, not Formats.WeightUnit — this mimics what a real
// camera's own hardware overlay would burn into the frame at capture time,
// same as an indicator's readout; not a UI surface the display-unit
// setting was ever meant to reach.
export const computeCameraBurnIn = (docSeq: number | null, captures: Capture[]): string => {
    const last = captures[captures.length - 1];
    if (!last) return "—";
    return `${formatTicketNo(docSeq)} · ${formatWeightKg(last.WeightKg)} kg · ${new Date(last.At).toLocaleTimeString()}`;
};
