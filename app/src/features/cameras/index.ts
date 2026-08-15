// Camera integration isn't ready for this release — flip to true to bring
// the feature back. A plain build-time flag rather than a Settings toggle:
// this hides it app-wide (nav tab, routing, and this sidebar shortcut)
// without touching the persisted settings schema, so nothing needs
// migrating once it comes back. Single source of truth here so App.tsx and
// any other consumer agree on it.
export const CAMERA_FEATURE_ENABLED = false;

export { computeCameraBurnIn } from "./cameraBurnIn";
export { CAMERA_SLOTS } from "./cameraFixtures";
export type { CameraSlot } from "./cameraFixtures";
export { CameraGrid } from "./CameraGrid";
export type { CameraGridProps } from "./CameraGrid";
export { CamerasScreen } from "./CamerasScreen";
export type { CamerasScreenProps } from "./CamerasScreen";
