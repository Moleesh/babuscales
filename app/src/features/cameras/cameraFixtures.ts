export interface CameraSlot {
    name: string;
    /** Shows the current ticket's vehicle number burned into the tile, centered — a real system would run ANPR against this feed to fill it automatically (PLAN §16), but ANPR is deferred by decision (PLAN §21 Phase 8), so this is a passthrough of what the operator already typed. */
    showsPlate: boolean;
    configured: boolean;
}

// Ported verbatim from the mock's own CAMS fixture (demo/BabuScales-demo.html)
// — a fixed 4-slot layout, not master-driven, not a Settings row. The mock
// itself never wires these to real video: no getUserMedia, no RTSP, no
// ONVIF, nothing captured or stored. Every tile is decorative, showing only
// the current ticket's own state (its vehicle number, its last capture's
// mark) — real capture is PLAN §16 in full, a documented gap
// (app/README.md), not something the reference spec itself demonstrates.
export const CAMERA_SLOTS: readonly CameraSlot[] = [
    { name: "Front", showsPlate: true, configured: true },
    { name: "Rear", showsPlate: false, configured: true },
    { name: "Plate", showsPlate: true, configured: true },
    { name: "Driver", showsPlate: false, configured: false },
];
