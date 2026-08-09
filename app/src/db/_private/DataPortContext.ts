import { createContext } from "react";

import type { DataPort } from "../DataPort";

export const DataPortContext = createContext<DataPort | null>(null);
