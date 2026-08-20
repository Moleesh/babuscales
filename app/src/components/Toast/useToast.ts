import { useContext } from "react";

import { ToastContext } from "./ToastContext";
import type { ToastContextValue } from "./ToastContext";

export const useToast = (): ToastContextValue => {
    const value = useContext(ToastContext);
    if (!value) throw new Error("useToast must be used within a ToastProvider");
    return value;
};
