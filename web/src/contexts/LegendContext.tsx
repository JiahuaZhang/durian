import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type MainLegend = {
    open: number;
    high: number;
    low: number;
    close: number;
};

export type VolumeLegend = {
    volume: number;
};

export type SMALegend = {
    value: number;
};

export type EMALegend = {
    value: number;
};

export type OverlayLegend = VolumeLegend | SMALegend | EMALegend;

// ============================================================================
// Context
// ============================================================================

type LegendContextType = {
    mainLegend: MainLegend | null;
    overlayLegends: Record<string, OverlayLegend | undefined>;
    setMainLegend: (legend: MainLegend | null) => void;
    setOverlayLegend: (id: string, legend: OverlayLegend | undefined) => void;
};

const LegendContext = createContext<LegendContextType | null>(null);

export function LegendProvider({ children }: { children: ReactNode }) {
    const [mainLegend, setMainLegendState] = useState<MainLegend | null>(null);
    const [overlayLegends, setOverlayLegends] = useState<Record<string, OverlayLegend | undefined>>({});

    const setMainLegend = useCallback((legend: MainLegend | null) => {
        setMainLegendState(legend);
    }, []);

    const setOverlayLegend = useCallback((id: string, legend: OverlayLegend | undefined) => {
        setOverlayLegends(prev => {
            // Skip update if value hasn't changed (avoid unnecessary re-renders)
            if (prev[id] === legend) return prev;
            return { ...prev, [id]: legend };
        });
    }, []);

    return (
        <LegendContext.Provider value={{
            mainLegend,
            overlayLegends,
            setMainLegend,
            setOverlayLegend,
        }}>
            {children}
        </LegendContext.Provider>
    );
}

export function useLegend() {
    const context = useContext(LegendContext);
    if (!context) {
        throw new Error('useLegend must be used within a LegendProvider');
    }
    return context;
}
