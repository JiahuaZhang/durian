import { createChart, ISeriesApi } from 'lightweight-charts';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export type CandleData = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustClose: number;
};

// Overlay types (rendered on main chart)
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

export type VolumeLegend = {
    volume: number;
};

export type OverlayLegend = VolumeLegend; // Union type for future overlay legends

export type OverlayIndicator = {
    id: string;
    type: OverlayType;
    visible: boolean;
    config: VolumeConfig | SMAConfig | EMAConfig;
    series?: ISeriesApi<any>;
    legend?: OverlayLegend;
};

// Indicator types (sub-charts below main)
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
    chart?: ReturnType<typeof createChart>;
    series?: Record<string, ISeriesApi<any>>;
    legend?: any;
};

// Main chart legend for crosshair hover data
export type MainLegend = {
    open: number;
    high: number;
    low: number;
    close: number;
};

// Main chart state
export type MainChartState = {
    data: CandleData[];
    chart: ReturnType<typeof createChart> | null;
    series: {
        candle?: ISeriesApi<"Candlestick">;
    };
    legend: MainLegend | null;
};

// Full chart state
export type ChartState = {
    main: MainChartState;
    overlays: OverlayIndicator[];
    indicators: SubIndicator[];
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

type ChartContextType = {
    state: ChartState;

    // Main chart
    setMainChart: (chart: ReturnType<typeof createChart> | null) => void;
    setMainData: (data: CandleData[]) => void;
    setMainSeries: (series: Partial<MainChartState['series']>) => void;
    setMainLegend: (legend: MainLegend | null) => void;

    // Overlays
    addOverlay: (type: OverlayType) => string;
    removeOverlay: (id: string) => void;
    updateOverlay: (id: string, updates: Partial<OverlayIndicator>) => void;
    toggleOverlay: (id: string) => void;
    getOverlay: (id: string) => OverlayIndicator | undefined;
    setOverlayLegend: (id: string, legend: OverlayLegend | undefined) => void;

    // Indicators
    addIndicator: (type: IndicatorType) => string;
    removeIndicator: (id: string) => void;
    updateIndicator: (id: string, updates: Partial<SubIndicator>) => void;
    updateIndicatorConfig: <T extends MACDConfig | RSIConfig>(id: string, configUpdates: Partial<T>) => void;
    toggleIndicator: (id: string) => void;
    getIndicator: (id: string) => SubIndicator | undefined;

    // Sync control
    syncingRef: React.RefObject<boolean>;
};

const ChartContext = createContext<ChartContextType | null>(null);

let idCounter = 0;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;

type ChartProviderProps = {
    children: ReactNode;
    initialData?: CandleData[];
};

export function ChartProvider({ children, initialData = [] }: ChartProviderProps) {
    const [state, setState] = useState<ChartState>({
        main: {
            data: initialData,
            chart: null,
            series: {},
            legend: null,
        },
        overlays: [
            // Default volume overlay
            {
                id: 'volume-default',
                type: 'volume',
                visible: true,
                config: defaultVolumeConfig,
            },
        ],
        indicators: [],
    });

    const syncingRef = useRef(false);

    // Main chart actions
    const setMainChart = useCallback((chart: ReturnType<typeof createChart> | null) => {
        setState(prev => ({ ...prev, main: { ...prev.main, chart } }));
    }, []);

    const setMainData = useCallback((data: CandleData[]) => {
        setState(prev => ({ ...prev, main: { ...prev.main, data } }));
    }, []);

    const setMainSeries = useCallback((series: Partial<MainChartState['series']>) => {
        setState(prev => ({
            ...prev,
            main: { ...prev.main, series: { ...prev.main.series, ...series } },
        }));
    }, []);

    const setMainLegend = useCallback((legend: MainLegend | null) => {
        setState(prev => ({
            ...prev,
            main: { ...prev.main, legend },
        }));
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

        setState(prev => ({
            ...prev,
            overlays: [...prev.overlays, { id, type, visible: true, config }],
        }));
        return id;
    }, []);

    const removeOverlay = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            overlays: prev.overlays.filter(o => o.id !== id),
        }));
    }, []);

    const updateOverlay = useCallback((id: string, updates: Partial<OverlayIndicator>) => {
        setState(prev => ({
            ...prev,
            overlays: prev.overlays.map(o => o.id === id ? { ...o, ...updates } : o),
        }));
    }, []);

    const toggleOverlay = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            overlays: prev.overlays.map(o => o.id === id ? { ...o, visible: !o.visible } : o),
        }));
    }, []);

    const getOverlay = useCallback((id: string) => {
        return state.overlays.find(o => o.id === id);
    }, [state.overlays]);

    const setOverlayLegend = useCallback((id: string, legend: OverlayLegend | undefined) => {
        setState(prev => ({
            ...prev,
            overlays: prev.overlays.map(o => o.id === id ? { ...o, legend } : o),
        }));
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

        setState(prev => ({
            ...prev,
            indicators: [...prev.indicators, { id, type, visible: true, config }],
        }));
        return id;
    }, []);

    const removeIndicator = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            indicators: prev.indicators.filter(i => i.id !== id),
        }));
    }, []);

    const updateIndicator = useCallback((id: string, updates: Partial<SubIndicator>) => {
        setState(prev => ({
            ...prev,
            indicators: prev.indicators.map(i => i.id === id ? { ...i, ...updates } : i),
        }));
    }, []);

    const updateIndicatorConfig = useCallback(<T extends MACDConfig | RSIConfig>(id: string, configUpdates: Partial<T>) => {
        setState(prev => ({
            ...prev,
            indicators: prev.indicators.map(i =>
                i.id === id ? { ...i, config: { ...i.config, ...configUpdates } } : i
            ),
        }));
    }, []);

    const toggleIndicator = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            indicators: prev.indicators.map(i => i.id === id ? { ...i, visible: !i.visible } : i),
        }));
    }, []);

    const getIndicator = useCallback((id: string) => {
        return state.indicators.find(i => i.id === id);
    }, [state.indicators]);

    return (
        <ChartContext.Provider value={{
            state,
            setMainChart,
            setMainData,
            setMainSeries,
            setMainLegend,
            addOverlay,
            removeOverlay,
            updateOverlay,
            toggleOverlay,
            getOverlay,
            setOverlayLegend,
            addIndicator,
            removeIndicator,
            updateIndicator,
            updateIndicatorConfig,
            toggleIndicator,
            getIndicator,
            syncingRef,
        }}>
            {children}
        </ChartContext.Provider>
    );
}

export function useChartContext() {
    const context = useContext(ChartContext);
    if (!context) {
        throw new Error('useChartContext must be used within a ChartProvider');
    }
    return context;
}

// Helper hooks for specific data
export function useMainChart() {
    const { state, setMainChart, setMainData, setMainSeries, setMainLegend } = useChartContext();
    return { ...state.main, setMainChart, setMainData, setMainSeries, setMainLegend };
}

export function useOverlays() {
    const { state, addOverlay, removeOverlay, updateOverlay, toggleOverlay, getOverlay, setOverlayLegend } = useChartContext();
    return { overlays: state.overlays, addOverlay, removeOverlay, updateOverlay, toggleOverlay, getOverlay, setOverlayLegend };
}

export function useIndicators() {
    const { state, addIndicator, removeIndicator, updateIndicator, updateIndicatorConfig, toggleIndicator, getIndicator } = useChartContext();
    return { indicators: state.indicators, addIndicator, removeIndicator, updateIndicator, updateIndicatorConfig, toggleIndicator, getIndicator };
}
