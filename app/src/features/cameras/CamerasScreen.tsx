import { Card } from "@components/Card";
import type { UseWeighingTicket } from "@features/weighing";

import { computeCameraBurnIn } from "./cameraBurnIn";
import { CAMERA_SLOTS } from "./cameraFixtures";
import { CameraGrid } from "./CameraGrid";

export interface CamerasScreenProps {
    /** Same lifted-to-Shell ticket every other tab reads (App.tsx) — the tiles burn in the vehicle/weight/time of whatever the operator currently has open on Weighing, exactly as the mock's `renderCams` does. */
    ticket: UseWeighingTicket;
}

// Ported from the mock's full-page camGrid (demo/BabuScales-demo.html,
// `data-screen="cameras"`) — a fixed 4-slot fixture (cameraFixtures.ts),
// no real video anywhere in the reference spec either. Real capture
// (USB/IP/RTSP/ONVIF, overlay burn-in on an actual frame, retention, ANPR)
// is PLAN §16 in full — a documented gap (app/README.md), not something
// this screen or the mock it's ported from claims to do.
export const CamerasScreen = ({ ticket }: CamerasScreenProps) => {
    const configuredCount = CAMERA_SLOTS.filter((slot) => slot.configured).length;
    const burnIn = computeCameraBurnIn(ticket.docSeq, ticket.captures);

    return (
        <Card
            title={<span className="lbl">Cameras</span>}
            headerRight={
                <span className="chip">
                    {configuredCount} of {CAMERA_SLOTS.length} configured
                </span>
            }
        >
            <CameraGrid vehicleNo={ticket.fields.vehicleNo} burnIn={burnIn} variant="page" />
        </Card>
    );
};
