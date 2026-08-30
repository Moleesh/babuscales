import { createSourceContext } from "@engines/_shared/createSourceContext";

import type { VerificationServerSource } from "../types";

// Provider/useSource pair for the single shared VerificationServerSource
// instance — see createSourceContext's own comment for the pattern this
// replaces.
export const { Provider: VerificationServerContextProvider, useSource: useVerificationServerSource } =
    createSourceContext<VerificationServerSource>(
        "useVerificationServer must be used within a VerificationServerProvider",
    );
