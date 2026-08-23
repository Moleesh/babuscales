import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import styles from "./_styles/Toast.module.css";
import { ToastContext } from "./ToastContext";
import type { ToastContextValue } from "./ToastContext";

// How long a toast stays up before it clears itself — same spirit as
// useFlashMessage's 3s, just a touch shorter since these fire far more
// often (every field save, not just a handful of Connections cards) and
// are meant to be glanced at, not read.
const TOAST_MS = 2200;

interface ToastEntry {
    id: number;
    text: string;
}

export interface ToastProviderProps {
    children: ReactNode;
}

// App-wide "small notification that dies on its own" — one instance
// mounted once at the root (App.tsx), reachable from anywhere via
// useToast(). Stacks bottom-center if more than one fires close together
// (e.g. a save that touches two fields at once); each entry clears itself
// on its own timer, independent of the others.
export const ToastProvider = ({ children }: ToastProviderProps) => {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const nextId = useRef(0);
    // Every pending auto-dismiss timer, keyed by toast id, so an unmount
    // (or an early dismiss) can clear it instead of letting a stray
    // `setTimeout` fire a `setState` on a provider that's already gone.
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    useEffect(
        () => () => {
            timers.current.forEach((timer) => clearTimeout(timer));
            timers.current.clear();
        },
        [],
    );

    const showToast = (text: string): void => {
        const id = nextId.current++;
        setToasts((prev) => [...prev, { id, text }]);
        const timer = setTimeout(() => {
            timers.current.delete(id);
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, TOAST_MS);
        timers.current.set(id, timer);
    };

    const value = useMemo<ToastContextValue>(() => ({ showToast }), []);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.stack} aria-live="polite" role="status">
                {toasts.map((toast) => (
                    <div key={toast.id} className={styles.toast}>
                        {toast.text}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
