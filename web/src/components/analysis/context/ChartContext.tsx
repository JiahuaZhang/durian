import { createChart, ISeriesApi } from 'lightweight-charts';
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { defaultMACDConfig } from '../plugin/macd/macd';
import { computeMAData, createMASeries, getDefaultMAConfig } from '../plugin/moving-average/ma';
import { computeVolumeData, createVolumeSeries, defaultVolumeConfig } from '../plugin/volume/volume';
import { useCandleData, type CandleData } from './ChartDataContext';

// Re-export CandleData types
export { useCandleData, type CandleData } from './ChartDataContext';

// ============================================================================
// Types
// ============================================================================

export type OverlayType = 'volume' | 'sma' | 'ema';
export type IndicatorType = 'macd' | 'rsi';

export type VolumeConfig = {
    upColor: string;
    downColor: string;
};

export type SMAConfig = {
    period: number;
    color: string;
    lineWidth: number;
    showCrossSignals: boolean;
    bullishColor: string;
    bearishColor: string;
    bullishTextColor: string;
    bearishTextColor: string;
};

export type EMAConfig = {
    period: number;
    color: string;
    lineWidth: number;
    showCrossSignals: boolean;
    bullishColor: string;
    bearishColor: string;
    bullishTextColor: string;
    bearishTextColor: string;
};

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

export type OverlayIndicator = {
    id: string;
    type: OverlayType;
    visible: boolean;
    config: VolumeConfig | SMAConfig | EMAConfig;
    data: any[];
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

// Legend types
export type MainLegend = {
    open: number;
    high: number;
    low: number;
    close: number;
};

export type VolumeLegend = { volume: number };
export type SMALegend = { value: number };
export type EMALegend = { value: number };
export type OverlayLegend = VolumeLegend | SMALegend | EMALegend;

// ============================================================================
// State
// ============================================================================

type ChartState = {
    overlays: Record<string, OverlayIndicator>;
    indicators: Record<string, SubIndicator>;
    mainLegend: MainLegend | null;
    overlayLegends: Record<string, OverlayLegend | undefined>;
};

const initialState: ChartState = {
    overlays: {
        'volume-default': {
            id: 'volume-default',
            type: 'volume',
            visible: true,
            config: { ...defaultVolumeConfig },
            data: [],
        },
    },
    indicators: {},
    mainLegend: null,
    overlayLegends: {},
};

// ============================================================================
// Actions
// ============================================================================

type ChartAction =
    | { type: 'OVERLAY_ADDED'; overlay: OverlayIndicator }
    | { type: 'OVERLAY_REMOVED'; id: string }
    | { type: 'OVERLAY_CONFIG_UPDATED'; id: string; config: VolumeConfig | SMAConfig | EMAConfig; data: any[] }
    | { type: 'OVERLAY_TOGGLED'; id: string; visible: boolean }
    | { type: 'INDICATOR_ADDED'; indicator: SubIndicator }
    | { type: 'INDICATOR_REMOVED'; id: string }
    | { type: 'INDICATOR_UPDATED'; id: string; updates: Partial<SubIndicator> }
    | { type: 'INDICATOR_CONFIG_UPDATED'; id: string; config: MACDConfig | RSIConfig }
    | { type: 'INDICATOR_TOGGLED'; id: string }
    | { type: 'MAIN_LEGEND_SET'; legend: MainLegend | null }
    | { type: 'OVERLAY_LEGEND_SET'; id: string; legend: OverlayLegend | undefined };

function chartReducer(state: ChartState, action: ChartAction): ChartState {
    switch (action.type) {
        case 'OVERLAY_ADDED':
            return { ...state, overlays: { ...state.overlays, [action.overlay.id]: action.overlay } };

        case 'OVERLAY_REMOVED': {
            const { [action.id]: _, ...rest } = state.overlays;
            const { [action.id]: __, ...legendRest } = state.overlayLegends;
            return { ...state, overlays: rest, overlayLegends: legendRest };
        }

        case 'OVERLAY_CONFIG_UPDATED':
            return {
                ...state,
                overlays: {
                    ...state.overlays,
                    [action.id]: {
                        ...state.overlays[action.id],
                        config: action.config,
                        data: action.data,
                    },
                },
            };

        case 'OVERLAY_TOGGLED':
            return {
                ...state,
                overlays: {
                    ...state.overlays,
                    [action.id]: { ...state.overlays[action.id], visible: action.visible },
                },
            };

        case 'INDICATOR_ADDED':
            return { ...state, indicators: { ...state.indicators, [action.indicator.id]: action.indicator } };

        case 'INDICATOR_REMOVED': {
            const { [action.id]: _, ...rest } = state.indicators;
            return { ...state, indicators: rest };
        }

        case 'INDICATOR_UPDATED':
            return {
                ...state,
                indicators: {
                    ...state.indicators,
                    [action.id]: { ...state.indicators[action.id], ...action.updates },
                },
            };

        case 'INDICATOR_CONFIG_UPDATED':
            return {
                ...state,
                indicators: {
                    ...state.indicators,
                    [action.id]: { ...state.indicators[action.id], config: action.config },
                },
            };

        case 'INDICATOR_TOGGLED':
            return {
                ...state,
                indicators: {
                    ...state.indicators,
                    [action.id]: { ...state.indicators[action.id], visible: !state.indicators[action.id].visible },
                },
            };

        case 'MAIN_LEGEND_SET':
            return { ...state, mainLegend: action.legend };

        case 'OVERLAY_LEGEND_SET':
            if (state.overlayLegends[action.id] === action.legend) return state;
            return { ...state, overlayLegends: { ...state.overlayLegends, [action.id]: action.legend } };

        default:
            return state;
    }
}



// ============================================================================
// Context
// ============================================================================

type ChartContextType = {
    state: ChartState;
    // Refs (for imperative access)
    chartRef: React.RefObject<ReturnType<typeof createChart> | null>;
    candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
    overlaySeriesRef: React.RefObject<Map<string, ISeriesApi<any>>>;
    syncingRef: React.RefObject<boolean>;
    // Action creators
    actions: {
        initChart: (chart: ReturnType<typeof createChart>, candleSeries: ISeriesApi<"Candlestick">) => void;
        destroyChart: () => void;
        addOverlay: (type: OverlayType) => string;
        removeOverlay: (id: string) => void;
        updateOverlayConfig: <T extends VolumeConfig | SMAConfig | EMAConfig>(id: string, configUpdates: Partial<T>) => void;
        toggleOverlay: (id: string) => void;
        addIndicator: (type: IndicatorType) => string;
        removeIndicator: (id: string) => void;
        updateIndicator: (id: string, updates: Partial<SubIndicator>) => void;
        updateIndicatorConfig: <T extends MACDConfig | RSIConfig>(id: string, configUpdates: Partial<T>) => void;
        toggleIndicator: (id: string) => void;
        setMainLegend: (legend: MainLegend | null) => void;
        setOverlayLegend: (id: string, legend: OverlayLegend | undefined) => void;
    };
};

const ChartContext = createContext<ChartContextType | null>(null);

let idCounter = 0;
const generateId = (prefix: string) => `${prefix}-${++idCounter}`;



export function ChartProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(chartReducer, initialState);
    const candleData = useCandleData();

    // Refs for imperative chart access — NOT in React state
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const overlaySeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
    const syncingRef = useRef(false);

    // We need a ref to read current state inside callbacks without re-creating them
    const stateRef = useRef(state);
    stateRef.current = state;

    // ── Action creators ──────────────────────────────────────────────────

    const initChart = useCallback((chart: ReturnType<typeof createChart>, candleSeries: ISeriesApi<"Candlestick">) => {
        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        // Create series for existing overlays (e.g. default volume)
        const currentState = stateRef.current;
        Object.values(currentState.overlays).forEach(overlay => {
            if (overlay.type === 'volume') {
                const config = overlay.config as VolumeConfig;
                const volumeSeries = createVolumeSeries(chart);
                const data = computeVolumeData(candleData, config);
                volumeSeries.setData(data as any);
                overlaySeriesRef.current.set(overlay.id, volumeSeries);

                // Adjust visibility + margins
                volumeSeries.applyOptions({ visible: overlay.visible });
                if (overlay.visible) {
                    volumeSeries.priceScale().applyOptions({
                        scaleMargins: { top: 0.8, bottom: 0 },
                    });
                    chart.priceScale('right').applyOptions({
                        scaleMargins: { top: 0.1, bottom: 0.2 },
                    });
                }

                dispatch({ type: 'OVERLAY_CONFIG_UPDATED', id: overlay.id, config: overlay.config, data });
            }
        });
    }, [candleData]);

    const destroyChart = useCallback(() => {
        overlaySeriesRef.current.clear();
        chartRef.current = null;
        candleSeriesRef.current = null;
    }, []);

    const addOverlay = useCallback((type: OverlayType): string => {
        const chart = chartRef.current;
        const id = generateId(type);

        if (type === 'volume') {
            const config: VolumeConfig = { ...defaultVolumeConfig };
            let data: any[] = [];

            if (chart) {
                const volumeSeries = createVolumeSeries(chart);
                data = computeVolumeData(candleData, config);
                volumeSeries.setData(data as any);
                overlaySeriesRef.current.set(id, volumeSeries);

                volumeSeries.priceScale().applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 },
                });
                chart.priceScale('right').applyOptions({
                    scaleMargins: { top: 0.1, bottom: 0.2 },
                });
            }

            dispatch({ type: 'OVERLAY_ADDED', overlay: { id, type, visible: true, config, data } });
        }

        if (type === 'sma' || type === 'ema') {
            const config = getDefaultMAConfig(type);
            let data: any[] = [];

            if (chart) {
                const maSeries = createMASeries(chart, config);
                data = computeMAData(candleData, type, config);
                maSeries.setData(data);
                overlaySeriesRef.current.set(id, maSeries);
            }

            dispatch({ type: 'OVERLAY_ADDED', overlay: { id, type, visible: true, config, data } });
        }

        return id;
    }, [candleData]);

    const removeOverlay = useCallback((id: string) => {
        const chart = chartRef.current;
        const series = overlaySeriesRef.current.get(id);
        if (chart && series) {
            try { chart.removeSeries(series); } catch { /* already removed */ }
            overlaySeriesRef.current.delete(id);
        }

        // Adjust margins if no volume visible
        if (chart) {
            const currentState = stateRef.current;
            const remainingVolumeVisible = Object.values(currentState.overlays).some(
                o => o.type === 'volume' && o.id !== id && o.visible
            );
            if (!remainingVolumeVisible) {
                chart.priceScale('right').applyOptions({
                    scaleMargins: { top: 0.1, bottom: 0 },
                });
            }
        }

        dispatch({ type: 'OVERLAY_REMOVED', id });
    }, []);

    const updateOverlayConfig = useCallback(<T extends VolumeConfig | SMAConfig | EMAConfig>(id: string, configUpdates: Partial<T>) => {
        const currentState = stateRef.current;
        const overlay = currentState.overlays[id];
        if (!overlay) return;

        const series = overlaySeriesRef.current.get(id);
        const newConfig = { ...overlay.config, ...configUpdates } as T;

        if (overlay.type === 'volume') {
            const data = computeVolumeData(candleData, newConfig as VolumeConfig);
            if (series) series.setData(data as any);
            dispatch({ type: 'OVERLAY_CONFIG_UPDATED', id, config: newConfig, data });
        }

        if (overlay.type === 'sma' || overlay.type === 'ema') {
            const maConfig = newConfig as SMAConfig | EMAConfig;

            // Apply style options
            if (series && ('color' in configUpdates || 'lineWidth' in configUpdates)) {
                series.applyOptions({
                    color: maConfig.color,
                    lineWidth: maConfig.lineWidth as 1 | 2 | 3 | 4,
                });
            }

            // Recompute data (always — period, color, or any change triggers this)
            const data = computeMAData(candleData, overlay.type, maConfig);
            if (series) series.setData(data);

            dispatch({ type: 'OVERLAY_CONFIG_UPDATED', id, config: newConfig, data });
        }
    }, [candleData]);

    const toggleOverlay = useCallback((id: string) => {
        const chart = chartRef.current;
        const currentState = stateRef.current;
        const overlay = currentState.overlays[id];
        if (!overlay) return;

        const newVisible = !overlay.visible;
        const series = overlaySeriesRef.current.get(id);

        if (series) {
            series.applyOptions({ visible: newVisible });

            if (overlay.type === 'volume' && newVisible) {
                series.priceScale().applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 },
                });
            }
        }

        // Adjust main chart margins based on volume visibility
        if (chart && overlay.type === 'volume') {
            const anyVolumeVisible = Object.values(currentState.overlays).some(
                o => o.type === 'volume' && (o.id === id ? newVisible : o.visible)
            );
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.1, bottom: anyVolumeVisible ? 0.2 : 0 },
            });
        }

        dispatch({ type: 'OVERLAY_TOGGLED', id, visible: newVisible });
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

        dispatch({ type: 'INDICATOR_ADDED', indicator: { id, type, visible: true, config } });
        return id;
    }, []);

    const removeIndicator = useCallback((id: string) => {
        dispatch({ type: 'INDICATOR_REMOVED', id });
    }, []);

    const updateIndicator = useCallback((id: string, updates: Partial<SubIndicator>) => {
        dispatch({ type: 'INDICATOR_UPDATED', id, updates });
    }, []);

    const updateIndicatorConfig = useCallback(<T extends MACDConfig | RSIConfig>(id: string, configUpdates: Partial<T>) => {
        const currentState = stateRef.current;
        const indicator = currentState.indicators[id];
        if (!indicator) return;
        const newConfig = { ...indicator.config, ...configUpdates } as T;
        dispatch({ type: 'INDICATOR_CONFIG_UPDATED', id, config: newConfig });
    }, []);

    const toggleIndicator = useCallback((id: string) => {
        dispatch({ type: 'INDICATOR_TOGGLED', id });
    }, []);

    // Legend actions
    const setMainLegend = useCallback((legend: MainLegend | null) => {
        dispatch({ type: 'MAIN_LEGEND_SET', legend });
    }, []);

    const setOverlayLegend = useCallback((id: string, legend: OverlayLegend | undefined) => {
        dispatch({ type: 'OVERLAY_LEGEND_SET', id, legend });
    }, []);

    const actions = useMemo(() => ({
        initChart,
        destroyChart,
        addOverlay,
        removeOverlay,
        updateOverlayConfig,
        toggleOverlay,
        addIndicator,
        removeIndicator,
        updateIndicator,
        updateIndicatorConfig,
        toggleIndicator,
        setMainLegend,
        setOverlayLegend,
    }), [initChart, destroyChart, addOverlay, removeOverlay, updateOverlayConfig, toggleOverlay,
        addIndicator, removeIndicator, updateIndicator, updateIndicatorConfig, toggleIndicator,
        setMainLegend, setOverlayLegend]);

    return (
        <ChartContext.Provider value={{ state, chartRef, candleSeriesRef, overlaySeriesRef, syncingRef, actions }}>
            {children}
        </ChartContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

function useChartContext() {
    const context = useContext(ChartContext);
    if (!context) {
        throw new Error('useChartContext must be used within a ChartProvider');
    }
    return context;
}

export function useChart() {
    const { chartRef, candleSeriesRef, syncingRef, actions } = useChartContext();
    return { chartRef, candleSeriesRef, syncingRef, actions };
}

export function useOverlays() {
    const { state, overlaySeriesRef, actions } = useChartContext();
    const overlays = state.overlays;
    return {
        overlays,
        overlaySeriesRef,
        addOverlay: actions.addOverlay,
        removeOverlay: actions.removeOverlay,
        updateOverlayConfig: actions.updateOverlayConfig,
        toggleOverlay: actions.toggleOverlay,
    };
}

export function useIndicators() {
    const { state, actions } = useChartContext();
    const indicators = state.indicators;

    const getIndicator = useCallback((id: string) => indicators[id], [indicators]);

    return {
        indicators,
        getIndicator,
        addIndicator: actions.addIndicator,
        removeIndicator: actions.removeIndicator,
        updateIndicator: actions.updateIndicator,
        updateIndicatorConfig: actions.updateIndicatorConfig,
        toggleIndicator: actions.toggleIndicator,
    };
}

export function useLegend() {
    const { state, actions } = useChartContext();
    return {
        mainLegend: state.mainLegend,
        overlayLegends: state.overlayLegends,
        setMainLegend: actions.setMainLegend,
        setOverlayLegend: actions.setOverlayLegend,
    };
}
