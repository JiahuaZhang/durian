import { createChart, ISeriesApi } from 'lightweight-charts';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// ============================================================================
// Overlay Types (rendered on main chart)
// ============================================================================

export type OverlayType = 'volume' | 'sma' | 'ema';

export type VolumeConfig = {
    upColor: string;
    downColor: string;
};

export type SMAConfig = {
    period: number;
    color: string;
    lineWidth: number;
};

export type EMAConfig = {
    period: number;
    color: string;
    lineWidth: number;
};

export type OverlayIndicator = {
    id: string;
    type: OverlayType;
    visible: boolean;
    config: VolumeConfig | SMAConfig | EMAConfig;
    data?: any;
    series?: ISeriesApi<any>;
};

// ============================================================================
// Indicator Types (sub-charts below main)
// ============================================================================

export type IndicatorType = 'macd' | 'rsi';

export type MACDConfig = {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    macdColor: string;
    signalColor: string;
    histogramUpColor: string;
    histogramDownColor: string;
    showDivergences: boolean;
    divergenceBullColor: string;
    divergenceBearColor: string;
    pivotLookbackLeft: number;
    pivotLookbackRight: number;
    rangeMin: number;
    rangeMax: number;
    dontTouchZero: boolean;
};

export type RSIConfig = {
    period: number;
    overbought: number;
    oversold: number;
    color: string;
};

export type SubIndicator = {
    id: string;
    type: IndicatorType;
    visible: boolean;
    config: MACDConfig | RSIConfig;
    data?: any;
    chart?: ReturnType<typeof createChart>;
    series?: Record<string, ISeriesApi<any>>;
};

// ============================================================================
// Main Chart State
// ============================================================================

export type MainChartState = {
    chart: ReturnType<typeof createChart> | null;
    series: {
        candle?: ISeriesApi<"Candlestick">;
    };
};

// ============================================================================
// Defaults
// ============================================================================

const defaultVolumeConfig: VolumeConfig = {
    upColor: '#26a69a',
    downColor: '#ef5350',
};

const defaultMACDConfig: MACDConfig = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    macdColor: '#2962FF',
    signalColor: '#FF6D00',
    histogramUpColor: '#26a69a',
    histogramDownColor: '#ef5350',
    showDivergences: true,
    divergenceBullColor: '#26A69A',
    divergenceBearColor: '#EF5350',
    pivotLookbackLeft: 20,
    pivotLookbackRight: 0,
    rangeMin: 5,
    rangeMax: 60,
    dontTouchZero: true,
};

// ============================================================================
// Context
// ============================================================================

type ChartConfigContextType = {
    // Main chart
    main: MainChartState;
    setMainChart: (chart: ReturnType<typeof createChart> | null) => void;
    setMainSeries: (series: Partial<MainChartState['series']>) => void;

    // Overlays
    overlays: OverlayIndicator[];
    addOverlay: (type: OverlayType) => string;
    removeOverlay: (id: string) => void;
    updateOverlay: (id: string, updates: Partial<OverlayIndicator>) => void;
    updateOverlayConfig: <T extends VolumeConfig | SMAConfig | EMAConfig>(id: string, configUpdates: Partial<T>) => void;
    toggleOverlay: (id: string) => void;
    getOverlay: (id: string) => OverlayIndicator | undefined;

    // Indicators
    indicators: SubIndicator[];
    addIndicator: (type: IndicatorType) => string;
    removeIndicator: (id: string) => void;
    updateIndicator: (id: string, updates: Partial<SubIndicator>) => void;
    updateIndicatorConfig: <T extends MACDConfig | RSIConfig>(id: string, configUpdates: Partial<T>) => void;
    toggleIndicator: (id: string) => void;
    getIndicator: (id: string) => SubIndicator | undefined;

    // Sync control
    syncingRef: React.RefObject<boolean>;
};

const ChartConfigContext = createContext<ChartConfigContextType | null>(null);

let idCounter = 0;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

export function ChartConfigProvider({ children }: { children: ReactNode }) {
    // Main chart state
    const [main, setMain] = useState<MainChartState>({
        chart: null,
        series: {},
    });

    // Overlays
    const [overlays, setOverlays] = useState<OverlayIndicator[]>([
        {
            id: 'volume-default',
            type: 'volume',
            visible: true,
            config: defaultVolumeConfig,
        },
    ]);

    // Indicators
    const [indicators, setIndicators] = useState<SubIndicator[]>([]);

    const syncingRef = useRef(false);

    // Main chart actions
    const setMainChart = useCallback((chart: ReturnType<typeof createChart> | null) => {
        setMain(prev => ({ ...prev, chart }));
    }, []);

    const setMainSeries = useCallback((series: Partial<MainChartState['series']>) => {
        setMain(prev => ({ ...prev, series: { ...prev.series, ...series } }));
    }, []);

    // Overlay actions
    const addOverlay = useCallback((type: OverlayType): string => {
        const id = generateId(type);
        let config: OverlayIndicator['config'];

        switch (type) {
            case 'volume':
                config = { ...defaultVolumeConfig };
                break;
            case 'sma':
                config = { period: 20, color: '#2962FF', lineWidth: 1 };
                break;
            case 'ema':
                config = { period: 20, color: '#FF6D00', lineWidth: 1 };
                break;
        }

        setOverlays(prev => [...prev, { id, type, visible: true, config }]);
        return id;
    }, []);

    const removeOverlay = useCallback((id: string) => {
        setOverlays(prev => prev.filter(o => o.id !== id));
    }, []);

    const updateOverlay = useCallback((id: string, updates: Partial<OverlayIndicator>) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    }, []);

    const toggleOverlay = useCallback((id: string) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, visible: !o.visible } : o));
    }, []);

    const getOverlay = useCallback((id: string) => {
        return overlays.find(o => o.id === id);
    }, [overlays]);

    const updateOverlayConfig = useCallback(<T extends VolumeConfig | SMAConfig | EMAConfig>(id: string, configUpdates: Partial<T>) => {
        setOverlays(prev => prev.map(o =>
            o.id === id ? { ...o, config: { ...o.config, ...configUpdates } } : o
        ));
    }, []);

    // Indicator actions
    const addIndicator = useCallback((type: IndicatorType): string => {
        const id = generateId(type);
        let config: SubIndicator['config'];

        switch (type) {
            case 'macd':
                config = { ...defaultMACDConfig };
                break;
            case 'rsi':
                config = { period: 14, overbought: 70, oversold: 30, color: '#7E57C2' };
                break;
        }

        setIndicators(prev => [...prev, { id, type, visible: true, config }]);
        return id;
    }, []);

    const removeIndicator = useCallback((id: string) => {
        setIndicators(prev => prev.filter(i => i.id !== id));
    }, []);

    const updateIndicator = useCallback((id: string, updates: Partial<SubIndicator>) => {
        setIndicators(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    }, []);

    const updateIndicatorConfig = useCallback(<T extends MACDConfig | RSIConfig>(id: string, configUpdates: Partial<T>) => {
        setIndicators(prev => prev.map(i =>
            i.id === id ? { ...i, config: { ...i.config, ...configUpdates } } : i
        ));
    }, []);

    const toggleIndicator = useCallback((id: string) => {
        setIndicators(prev => prev.map(i => i.id === id ? { ...i, visible: !i.visible } : i));
    }, []);

    const getIndicator = useCallback((id: string) => {
        return indicators.find(i => i.id === id);
    }, [indicators]);

    return (
        <ChartConfigContext.Provider value={{
            main,
            setMainChart,
            setMainSeries,
            overlays,
            addOverlay,
            removeOverlay,
            updateOverlay,
            updateOverlayConfig,
            toggleOverlay,
            getOverlay,
            indicators,
            addIndicator,
            removeIndicator,
            updateIndicator,
            updateIndicatorConfig,
            toggleIndicator,
            getIndicator,
            syncingRef,
        }}>
            {children}
        </ChartConfigContext.Provider>
    );
}

export function useChartConfig() {
    const context = useContext(ChartConfigContext);
    if (!context) {
        throw new Error('useChartConfig must be used within a ChartConfigProvider');
    }
    return context;
}

// Convenience hooks
export function useMainChart() {
    const { main, setMainChart, setMainSeries } = useChartConfig();
    return { ...main, setMainChart, setMainSeries };
}

export function useOverlays() {
    const { overlays, addOverlay, removeOverlay, updateOverlay, updateOverlayConfig, toggleOverlay, getOverlay } = useChartConfig();
    return { overlays, addOverlay, removeOverlay, updateOverlay, updateOverlayConfig, toggleOverlay, getOverlay };
}

export function useIndicators() {
    const { indicators, addIndicator, removeIndicator, updateIndicator, updateIndicatorConfig, toggleIndicator, getIndicator } = useChartConfig();
    return { indicators, addIndicator, removeIndicator, updateIndicator, updateIndicatorConfig, toggleIndicator, getIndicator };
}
