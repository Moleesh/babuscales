import { useContext } from "react";

import { DataPortContext } from "./_private/DataPortContext";
import type { DataPort } from "./DataPort";

export const useDataPort = (): DataPort => {
    const db = useContext(DataPortContext);
    if (!db) throw new Error("useDataPort must be used within a DataPortProvider");
    return db;
};
