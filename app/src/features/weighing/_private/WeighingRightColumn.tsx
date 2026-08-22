import { Card } from "@components/Card";
import type { WeightUnit } from "@constants/numberFormat";
import type { CaptureType } from "@db/ticketBody";
import type { IndicatorReading } from "@engines/indicator";
import { CAMERA_FEATURE_ENABLED, computeCameraBurnIn, CAMERA_SLOTS, CameraGrid } from "@features/cameras";
import { useTranslation } from "@i18n/useTranslation";

import styles from "../_styles/WeighingScreen.module.css";
import type { UseWeighingTicket } from "../useWeighingTicket";
import { ActionsCard } from "./ActionsCard";
import { captureHint, captureLabel } from "./captureStatus";

export interface WeighingRightColumnProps {
    ticket: UseWeighingTicket;
    reading: IndicatorReading;
    loadLorry: ((kind: CaptureType) => void) | undefined;
    armed: boolean;
    gated: boolean;
    /** A custom Field's Block-severity Validate rule is currently failing — computed once in WeighingScreen (it has both ticketSchema and ticket in scope) and threaded down to gate Save. */
    hasBlockingCustomFieldError: boolean;
    onSave: () => void;
    onOpenPrintModal: () => void;
    /** Opens ReprintLookupModal's "enter a ticket no" prompt. */
    onOpenReprintLookup: () => void;
    /** Jumps to the Cameras tab (App.tsx's `setActiveTab`) — a shortcut out
     * of this decorative sidebar to the real Cameras screen. */
    onNavigateToCameras: () => void;
    /** Settings' `Formats.WeightUnit` — passed straight through to ActionsCard's status pill. */
    weightUnit: WeightUnit;
}

// Split out of WeighingScreen (over the line budget — docs/CodingStandards.md)
// — the right `.col`: the Actions card plus the mock's own decorative
// camera sidebar (@features/cameras). Camera burn-in is derived here since
// nothing outside this column ever needs it.
export const WeighingRightColumn = ({
    ticket,
    reading,
    loadLorry,
    armed,
    gated,
    hasBlockingCustomFieldError,
    onSave,
    onOpenPrintModal,
    onOpenReprintLookup,
    onNavigateToCameras,
    weightUnit,
}: WeighingRightColumnProps) => {
    const { t } = useTranslation();
    const cameraBurnIn = computeCameraBurnIn(ticket.docSeq, ticket.captures);
    const configuredCameraCount = CAMERA_SLOTS.filter((slot) => slot.configured).length;

    return (
        <>
            <div className={styles.actionsSticky}>
                <ActionsCard
                    ticket={ticket}
                    reading={reading}
                    loadLorry={loadLorry}
                    armed={armed}
                    gated={gated}
                    hasBlockingCustomFieldError={hasBlockingCustomFieldError}
                    captureLabel={captureLabel(ticket, t)}
                    captureHint={captureHint(ticket, armed, t)}
                    onSave={onSave}
                    onOpenPrintModal={onOpenPrintModal}
                    onOpenReprintLookup={onOpenReprintLookup}
                    weightUnit={weightUnit}
                />
            </div>

            {CAMERA_FEATURE_ENABLED && (
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
            )}
        </>
    );
};
