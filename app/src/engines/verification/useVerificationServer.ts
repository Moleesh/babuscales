import { useContext } from "react";

import { VerificationServerContext } from "./_private/VerificationServerContext";
import type { VerificationServerSource } from "./types";

export const useVerificationServer = (): VerificationServerSource => {
    const source = useContext(VerificationServerContext);
    if (!source)
        throw new Error("useVerificationServer must be used within a VerificationServerProvider");
    return source;
};
