import { useMemo, useRef, useState } from "react";

import { ScrollArea } from "@components/ScrollArea";

import styles from "./_styles/PrintTemplatesCard.module.css";
import { TemplatePreviewControls } from "./TemplatePreviewControls";
import { useTemplatePreviewPan } from "./useTemplatePreviewPan";

const MM_TO_PX = 96 / 25.4;

export interface TemplatePreviewFrameProps {
    html: string;
    widthMm: number;
    heightMm: number;
    marginMm: number;
    /**
     * Width (px) the preview fills at 100% zoom. The wizard's inline details
     * step keeps this small (the old fixed 260px) so the form around it
     * doesn't get crowded; the standalone Preview modal — task: "make better
     * use of the space" — passes the modal's own available width instead.
     */
    fitWidthPx?: number;
    /** Viewport's own max height (px) — it stays this size regardless of zoom, scrolling/panning over content that overflows it, rather than growing without bound. */
    maxHeightPx?: number;
    /** Zoom/pan controls — off for the wizard's inline step, on (below the frame — task: "move the zoom to the bottom") for the standalone Preview modal. */
    showZoomControls?: boolean;
}

// Live preview for both the wizard's details step and the table's standalone
// Preview button — sandboxed (no scripts, no same-origin access) since the
// HTML rendered here came from an upload/paste an admin controls but this
// component itself can't verify. The iframe is always laid out at its true
// pixel size (so the template's own CSS, written against real paper mm,
// never has to guess a viewport) and then visually scaled to fit — `zoom` is
// a multiplier on top of that base fit-scale. The viewport is a fixed size
// that scrolls/pans over content bigger than it, via the app's own
// ScrollArea (task: "not the standard scroll bar we use" — a plain
// `overflow: auto` div here drew the native OS scrollbar on top of, not
// instead of, the drag-pan gesture, reading as a double scrollbar).
export const TemplatePreviewFrame = ({
    html,
    widthMm,
    heightMm,
    marginMm,
    fitWidthPx = 260,
    maxHeightPx = 320,
    showZoomControls = false,
}: TemplatePreviewFrameProps) => {
    const [zoom, setZoom] = useState(100);
    const [panMode, setPanMode] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);
    useTemplatePreviewPan(panMode, viewportRef);
    const widthPx = Math.max(1, widthMm) * MM_TO_PX;
    const heightPx = Math.max(1, heightMm) * MM_TO_PX;
    const scale = (fitWidthPx / widthPx) * (zoom / 100);
    const scaledWidth = widthPx * scale;
    const scaledHeight = heightPx * scale;

    const srcDoc = useMemo(
        () =>
            `<!doctype html><html><head><meta charset="utf-8"><style>` +
            `html,body{margin:0;padding:0;}` +
            `body{box-sizing:border-box;padding:${marginMm}mm;width:${widthMm}mm;min-height:${heightMm}mm;}` +
            `</style></head><body>${html}</body></html>`,
        [html, widthMm, heightMm, marginMm],
    );

    return (
        <div className={styles.previewFrameWrap}>
            <div
                className={styles.previewViewportBox}
                style={{ width: Math.min(fitWidthPx, scaledWidth), height: Math.min(maxHeightPx, scaledHeight) }}
            >
                <ScrollArea
                    className={styles.previewScrollArea}
                    contentClassName={`${styles.previewViewport} ${panMode ? styles.previewViewportPan : ""}`}
                    contentRef={viewportRef}
                >
                    <iframe
                        title="template-preview"
                        sandbox=""
                        srcDoc={srcDoc}
                        className={styles.previewFrame}
                        style={{ width: widthPx, height: heightPx, transform: `scale(${scale})` }}
                    />
                </ScrollArea>
            </div>
            {showZoomControls && (
                <TemplatePreviewControls zoom={zoom} onZoom={setZoom} panMode={panMode} onTogglePan={() => setPanMode((p) => !p)} />
            )}
        </div>
    );
};
