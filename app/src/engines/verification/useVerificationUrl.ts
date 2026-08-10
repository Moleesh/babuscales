import { useEffect, useState } from "react";

import { useVerificationServer } from "./useVerificationServer";

// Resolves the running verification server's shareable base URL (LAN,
// falling back to loopback) for slip printing (@features/weighing's
// WeighingScreen) — null while the feature is off, not yet up, or (the
// GitHub Pages/memory-adapter build) the no-op source is in play. Re-checks
// whenever `refreshKey` changes, so passing Settings' Integrations.qr flag
// picks up App.tsx's VerificationServerSync starting/stopping the server on
// that same toggle — one cheap status() call, not a subscription. Flipping
// the toggle and printing in the same instant can still race the server's
// own startup (this checks status independently of that start() call); in
// practice the integration is turned on well before the first ticket ever
// prints, so that narrow window isn't worth a retry loop.
export const useVerificationUrl = (refreshKey: unknown): string | null => {
    const source = useVerificationServer();
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        void source.status().then((status) => {
            if (!cancelled) setUrl(status ? (status.LanUrl ?? status.LoopbackUrl) : null);
        });
        return () => {
            cancelled = true;
        };
    }, [source, refreshKey]);

    return url;
};
