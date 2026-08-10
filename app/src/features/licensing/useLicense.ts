import { useContext } from "react";

import { LicenseContext } from "./_private/LicenseContext";
import type { LicenseContextValue } from "./_private/LicenseContext";

export const useLicense = (): LicenseContextValue => {
    const value = useContext(LicenseContext);
    if (!value) throw new Error("useLicense must be used within a LicenseProvider");
    return value;
};
