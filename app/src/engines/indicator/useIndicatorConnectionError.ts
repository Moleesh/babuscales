import { useSyncExternalStore } from "react";

import { isSerialIndicatorSource } from "./types";
import type { IndicatorSource } from "./types";

// Stable, shared across every call — a fresh `() => () => {}` (or `() =>
// null`) every render would make useSyncExternalStore think it's a new
// subscribe/getSnapshot function each time, which is harmless but
// pointless churn for a hook that's meant to be cheap to call from the
// header on every screen.
const noopSubscribe = () => () => {};
const getNullSnapshot = (): string | null => null;

// Its own hook rather than reusing useIndicatorReading: that hook's
// useSyncExternalStore snapshot is `source.getReading()`, an object
// reference that isn't replaced on a pure connection-error transition with
// no new weight sample, so it can be missed by Object.is.
// `getConnectionError()` returns a primitive `string | null`, which
// compares correctly by value on every notify.
//
// Returns `null` (never errored) for the simulated adapter — it has no
// `getConnectionError` at all, there's nothing to "not connect" to.
export const useIndicatorConnectionError = (source: IndicatorSource): string | null => {
    const serial = isSerialIndicatorSource(source) ? source : null;
    return useSyncExternalStore(
        serial ? serial.subscribe : noopSubscribe,
        serial ? serial.getConnectionError : getNullSnapshot,
    );
};
