// A structural subset of `features/cameras/cameraFixtures.ts`'s `CameraSlot`
// — deliberately re-declared rather than imported. `components/` may not
// depend on `features/` (docs/CodingStandards.md §2, Rule 3); TypeScript's
// structural typing means any object shaped like this — the fixture rows
// included — satisfies it without either side importing the other.
export interface CameraTileSlot {
    name: string;
    showsPlate: boolean;
    configured: boolean;
}

export interface CameraTileProps {
    slot: CameraTileSlot;
    vehicleNo: string;
    burnIn: string;
}
