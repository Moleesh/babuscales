import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";

/** What `createSourceContext` hands back: a ready-to-use Context/Provider/hook triple for a single "one instance for the whole app" engine source — the shape `IndicatorProvider`/`TunnelProvider`/`VerificationServerProvider` all shared before this factory replaced their hand-written duplicates. */
export interface SourceContextTriple<T> {
    Provider: (props: { source: T; children: ReactNode }) => ReactElement;
    useSource: () => T;
}

// Factory for the "single value, provided once, read via a `useX()` that
// throws outside its Provider" pattern repeated identically across
// engines/indicator, engines/tunnel, and engines/verification — each engine
// creates exactly one source instance (the adapter picked at startup) and
// hands it down for the rest of the app to reach via a hook instead of prop
// drilling. `usageError` is the exact message thrown when the hook is
// called outside its Provider — worded the same way each hand-written hook
// already did (e.g. "useIndicator must be used within an IndicatorProvider").
// Deliberately NOT used for schemaEngine's
// SchemaProvider — that one composes several props via `useMemo` into a
// derived value rather than passing a single source straight through, a
// genuinely different shape, not just a naming variation of this one.
export const createSourceContext = <T,>(usageError: string): SourceContextTriple<T> => {
    const Context = createContext<T | null>(null);

    const Provider = ({ source, children }: { source: T; children: ReactNode }): ReactElement => (
        <Context.Provider value={source}>{children}</Context.Provider>
    );

    const useSource = (): T => {
        const source = useContext(Context);
        if (source === null) throw new Error(usageError);
        return source;
    };

    return { Provider, useSource };
};
