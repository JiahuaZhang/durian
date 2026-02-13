import { createChart, ISeriesApi } from 'lightweight-charts';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

type MainChartState = {
    chart: ReturnType<typeof createChart> | null;
    series: {
        candle?: ISeriesApi<"Candlestick">;
    };
};

// ============================================================================
// Context
// ============================================================================

type MainChartContextType = {
    chart: ReturnType<typeof createChart> | null;
    series: MainChartState['series'];
    setMainChart: (chart: ReturnType<typeof createChart> | null) => void;
    setMainSeries: (series: Partial<MainChartState['series']>) => void;
    syncingRef: React.RefObject<boolean>;
};

const MainChartContext = createContext<MainChartContextType | null>(null);

export function MainChartProvider({ children }: { children: ReactNode }) {
    const [chart, setChartState] = useState<ReturnType<typeof createChart> | null>(null);
    const [series, setSeriesState] = useState<MainChartState['series']>({});
    const syncingRef = useRef(false);

    const setMainChart = useCallback((chart: ReturnType<typeof createChart> | null) => {
        setChartState(chart);
    }, []);

    const setMainSeries = useCallback((updates: Partial<MainChartState['series']>) => {
        setSeriesState(prev => ({ ...prev, ...updates }));
    }, []);

    return (
        <MainChartContext.Provider value={{ chart, series, setMainChart, setMainSeries, syncingRef }}>
            {children}
        </MainChartContext.Provider>
    );
}

export function useMainChart() {
    const context = useContext(MainChartContext);
    if (!context) {
        throw new Error('useMainChart must be used within a MainChartProvider');
    }
    return context;
}
