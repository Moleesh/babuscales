import type { ReactNode } from "react";

import { DataPortContext } from "./_private/DataPortContext";
import type { DataPort } from "./DataPort";

export interface DataPortProviderProps {
    db: DataPort;
    children: ReactNode;
}

// One instance for the whole app — created once by whatever picks the
// adapter (createDataPort()) and handed down, never re-created per screen.
export const DataPortProvider = ({ db, children }: DataPortProviderProps) => (
    <DataPortContext.Provider value={db}>{children}</DataPortContext.Provider>
);
