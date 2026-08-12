import { Card } from "@components/Card";
import type { CaptureType } from "@db/ticketBody";
import type { IndicatorReading } from "@engines/indicator";
import { computeCameraBurnIn, CAMERA_SLOTS, CameraGrid } from "@features/cameras";
import { useTranslation } from "@i18n/useTranslation";

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
    /** A custom Field's Block-severity Validate rule is currently failing — computed once in WeighingScreen (it has both ticketSchema and ticket in scope) and threaded down to gate Save. */
    hasBlockingCustomFieldError: boolean;
    onSave: () => void;
    onOpenPrintModal: () => void;
    /** Jumps to the Cameras tab (App.tsx's `setActiveTab`) — a shortcut out
     * of this decorative sidebar to the real Cameras screen (PLAN §21). */
    onNavigateToCameras: () => void;
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
    hasBlockingCustomFieldError,
    onSave,
    onOpenPrintModal,
    onNavigateToCameras,
}: WeighingRightColumnProps) => {
    const { t } = useTranslation();
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
                hasBlockingCustomFieldError={hasBlockingCustomFieldError}
                captureLabel={captureLabel(ticket, multiGross)}
                captureHint={captureHint(ticket, armed)}
                onSave={onSave}
                onOpenPrintModal={onOpenPrintModal}
            />

            <Card
                title={<span className="lbl">{t("weigh.cameras")}</span>}
                headerRight={
                    <span className="chip">
                        {configuredCameraCount} {t("weigh.of")} {CAMERA_SLOTS.length}{" "}
                        {t("weigh.configured")}
                    </span>
                }
            >
                <CameraGrid vehicleNo={ticket.fields.vehicleNo} burnIn={cameraBurnIn} variant="sidebar" />
                <button type="button" className="chip act" onClick={onNavigateToCameras}>
                    {t("weigh.goToCameras")}
                </button>
            </Card>
        </>
    );
};
