import { useEffect, useState } from "react";

// True only when the follower should actually run: motion is allowed and
// the pointer is a mouse (a touch/coarse pointer has no "hover" concept for
// the follower to react to). Split out of CustomCursor.tsx purely to keep
// that component under its function-length budget (docs/CodingStandards.md).
export const useCursorEnabled = (): boolean => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const finePointer = window.matchMedia("(pointer: fine)");
        const update = () => setEnabled(!reduceMotion.matches && finePointer.matches);
        update();
        reduceMotion.addEventListener("change", update);
        finePointer.addEventListener("change", update);
        return () => {
            reduceMotion.removeEventListener("change", update);
            finePointer.removeEventListener("change", update);
        };
    }, []);

    return enabled;
};
