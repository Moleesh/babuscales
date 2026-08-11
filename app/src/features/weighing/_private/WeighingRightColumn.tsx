import { Card } from "@components/Card";
import type { CaptureType } from "@db/ticketBody";
import type { IndicatorReading } from "@engines/indicator";
import { computeCameraBurnIn, CAMERA_SLOTS, CameraGrid } from "@features/cameras";

import type { UseWeighingTicket } from "../useWeighingTicket";
import { ActionsCard } from "./ActionsCard";
import { captureHint, captureLabel } from "./captureStatus";

export interface WeighingRightColumnProps {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    loadLorry: ((kind: CaptureType) => void) | undefined;
    multiGross: boolean;
    armed: boolean;
    gated: boolean;
    onSave: () => void;
    onOpenPrintModal: () => void;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the right `.col`: the Actions card plus the mock's own decorative
// camera sidebar (@features/cameras). Camera burn-in is derived here since
// nothing outside this column ever needs it.
export const WeighingRightColumn = ({
    ticket,
    reading,
    loadLorry,
    multiGross,
    armed,
    gated,
    onSave,
    onOpenPrintModal,
}: WeighingRightColumnProps) => {
    const cameraBurnIn = computeCameraBurnIn(ticket.docSeq, ticket.captures);
    const configuredCameraCount = CAMERA_SLOTS.filter((slot) => slot.configured).length;

    return (
        <>
            <ActionsCard
                ticket={ticket}
                reading={reading}
                loadLorry={loadLorry}
                multiGross={multiGross}
                armed={armed}
                gated={gated}
                captureLabel={captureLabel(ticket, multiGross)}
                captureHint={captureHint(ticket, armed)}
                onSave={onSave}
                onOpenPrintModal={onOpenPrintModal}
            />

            <Card
                title={<span className="lbl">Cameras</span>}
                headerRight={
                    <span className="chip">
                        {configuredCameraCount} of {CAMERA_SLOTS.length} configured
                    </span>
                }
            >
                <CameraGrid vehicleNo={ticket.fields.vehicleNo} burnIn={cameraBurnIn} variant="sidebar" />
            </Card>
        </>
    );
};
