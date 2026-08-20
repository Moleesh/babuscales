import { createContext } from "react";

export interface ToastContextValue {
    /** Queues a small self-clearing notification — the caller passes
     * already-localized text, same convention as Tooltip's `label`. */
    showToast: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
