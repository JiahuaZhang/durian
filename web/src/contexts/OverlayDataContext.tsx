import { HistogramSeries, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMA, SMA } from 'technicalindicators';
import { useOverlayConfigs, type EMAConfig, type SMAConfig, type VolumeConfig } from './ChartConfigContext';
import { useCandleData } from './ChartDataContext';
import { useMainChart } from './MainChartContext';

// ============================================================================
// Types
// ============================================================================

type OverlayData = {
    data: any;
    series: ISeriesApi<any> | null;
};

// ============================================================================
// Context
// ============================================================================

type OverlayDataContextType = {
    overlayDataMap: Record<string, OverlayData>;
    getOverlayData: (id: string) => OverlayData | undefined;
};

const OverlayDataContext = createContext<OverlayDataContextType | null>(null);

export function OverlayDataProvider({ children }: { children: ReactNode }) {
    const [overlayDataMap, setOverlayDataMap] = useState<Record<string, OverlayData>>({});
    const { chart } = useMainChart();
    const { overlays } = useOverlayConfigs();
    const candleData = useCandleData();

    // Split overlays by type for separate effects
    const volumeOverlays = useMemo(
        () => overlays.filter(o => o.type === 'volume'),
        [overlays]
    );
    const maOverlays = useMemo(
        () => overlays.filter(o => o.type === 'sma' || o.type === 'ema'),
        [overlays]
    );

    // ── Volume overlays ──────────────────────────────────────────────────
    useEffect(() => {
        if (!chart || !candleData.length || volumeOverlays.length === 0) return;

        const created: Record<string, OverlayData> = {};

        volumeOverlays.forEach(overlay => {
            const config = overlay.config as VolumeConfig;
            const volumeData = candleData.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? config.upColor : config.downColor,
            }));

            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceScaleId: '',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            volumeSeries.setData(volumeData as any);

            created[overlay.id] = { data: volumeData, series: volumeSeries };
        });

        setOverlayDataMap(prev => ({ ...prev, ...created }));

        return () => {
            Object.values(created).forEach(({ series }) => {
                try { chart.removeSeries(series!); } catch { /* already removed */ }
            });
            setOverlayDataMap(prev => {
                const next = { ...prev };
                for (const id of Object.keys(created)) delete next[id];
                return next;
            });
        };
    }, [chart, candleData, volumeOverlays]);

    // ── SMA / EMA overlays ───────────────────────────────────────────────
    useEffect(() => {
        if (!chart || !candleData.length || maOverlays.length === 0) return;

        const created: Record<string, OverlayData> = {};
        const closePrices = candleData.map(d => d.close);

        maOverlays.forEach(overlay => {
            const config = overlay.config as SMAConfig | EMAConfig;

            const calculatedValues = overlay.type === 'sma'
                ? SMA.calculate({ period: config.period, values: closePrices })
                : EMA.calculate({ period: config.period, values: closePrices });

            const seriesData = calculatedValues.length
                ? candleData.slice(config.period - 1).map((d, i) => ({
                    time: d.time as unknown as Time,
                    value: calculatedValues[i],
                }))
                : [];

            const maSeries = chart.addSeries(LineSeries, {
                color: config.color,
                lineWidth: config.lineWidth as 1 | 2 | 3 | 4,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: true,
            });
            maSeries.setData(seriesData);

            created[overlay.id] = { data: seriesData, series: maSeries };
        });

        setOverlayDataMap(prev => ({ ...prev, ...created }));

        return () => {
            Object.values(created).forEach(({ series }) => {
                try { chart.removeSeries(series!); } catch { /* already removed */ }
            });
            setOverlayDataMap(prev => {
                const next = { ...prev };
                for (const id of Object.keys(created)) delete next[id];
                return next;
            });
        };
    }, [chart, candleData, maOverlays]);

    const getOverlayData = useCallback((id: string) => {
        return overlayDataMap[id];
    }, [overlayDataMap]);

    return (
        <OverlayDataContext.Provider value={{ overlayDataMap, getOverlayData }}>
            {children}
        </OverlayDataContext.Provider>
    );
}

export function useOverlayData() {
    const context = useContext(OverlayDataContext);
    if (!context) {
        throw new Error('useOverlayData must be used within an OverlayDataProvider');
    }
    return context;
}
