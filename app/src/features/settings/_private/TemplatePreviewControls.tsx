import styles from "./_styles/PrintTemplatesCard.module.css";

export const ZOOM_STEP = 25;
export const MIN_ZOOM = 50;
export const MAX_ZOOM = 200;

export interface TemplatePreviewControlsProps {
    zoom: number;
    onZoom: (next: number) => void;
    panMode: boolean;
    onTogglePan: () => void;
}

// Zoom +/-/Fit plus the hand-tool toggle, pulled out of TemplatePreviewFrame
// purely to keep that file under its own line budget. Task: "in template
// preview we need a hand option to traverse the page" — the 🖐 button
// switches the viewport below into drag-to-pan mode (see
// TemplatePreviewFrame's pointer handlers) instead of normal scrollbar-only
// panning, useful once a zoomed-in template is bigger than the viewport in
// both directions.
export const TemplatePreviewControls = ({ zoom, onZoom, panMode, onTogglePan }: TemplatePreviewControlsProps) => (
    <div className={styles.zoomControls}>
        <button type="button" className="iconbtn" disabled={zoom <= MIN_ZOOM} onClick={() => onZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP))}>
            −
        </button>
        <span className={styles.zoomLabel}>{zoom}%</span>
        <button type="button" className="iconbtn" disabled={zoom >= MAX_ZOOM} onClick={() => onZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))}>
            +
        </button>
        <button type="button" className={styles.zoomReset} onClick={() => onZoom(100)}>
            Fit
        </button>
        <button
            type="button"
            className={`${styles.zoomReset} ${panMode ? styles.zoomHandActive : ""}`}
            aria-pressed={panMode}
            title="Drag to pan"
            onClick={onTogglePan}
        >
            🖐
        </button>
    </div>
);
