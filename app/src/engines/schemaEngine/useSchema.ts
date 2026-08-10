import { useContext } from "react";

import { SchemaContext } from "./_private/SchemaContext";
import type { SchemaContextValue } from "./_private/SchemaContext";

export const useSchema = (): SchemaContextValue => {
    const value = useContext(SchemaContext);
    if (!value) throw new Error("useSchema must be used within a SchemaProvider");
    return value;
};
