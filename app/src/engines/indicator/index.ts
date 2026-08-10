export { createSimulatedIndicator } from "./simulatedIndicator";
export type { SimulatedIndicatorOptions, SimulatedIndicatorSource } from "./simulatedIndicator";
export { IndicatorProvider } from "./IndicatorProvider";
export type { IndicatorProviderProps } from "./IndicatorProvider";
export { isSerialIndicatorSource } from "./types";
export type {
    IndicatorConnectionConfig,
    IndicatorListener,
    IndicatorReading,
    IndicatorSource,
    SerialIndicatorSource,
    StabilityOptions,
} from "./types";
export { useIndicator } from "./useIndicator";
export { useIndicatorReading } from "./useIndicatorReading";
// createIndicatorSource / createSerialIndicator are deliberately NOT
// exported here — see createIndicatorSource.ts's own comment. Import
// createIndicatorSource directly from "@engines/indicator/createIndicatorSource".
