import { CandlestickSeries, createChart, createSeriesMarkers, HistogramData, LineData, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { CandleData } from '../contexts/ChartContext';
import { ChartProvider, EMAConfig, SMAConfig, useCandleData, useIndicators, useLegend, useMainChart, useOverlayConfigs, useOverlayData } from '../contexts/ChartContext';
import { AuxiliaryChart } from './AuxiliaryChart';
import { ChartLegend } from './ChartLegend';
import { findMACrosses } from './MovingAverageSignal';
import { TechnicalSignals } from './TechnicalSignals';

type AnalysisChartProps = {
    data: CandleData[]
}

const AddButton = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
    <button
        onClick={onClick}
        un-p="x-3 y-1"
        un-text="xs slate-600"
        un-bg="white hover:slate-100"
        un-border="~ slate-200 rounded-md"
        un-shadow="sm"
        un-cursor="pointer"
    >
        {children}
    </button>
)

function AnalysisChartInner() {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const data = useCandleData()
    const { chart, series, setMainChart, setMainSeries } = useMainChart()
    const { overlays, addOverlay } = useOverlayConfigs()
    const { overlayDataMap } = useOverlayData()
    const { addIndicator } = useIndicators()
    const { setMainLegend, setOverlayLegend } = useLegend()

    // Create main chart (candlestick only)
    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return

        const newChart = createChart(chartContainerRef.current)

        const mainSeries = newChart.addSeries(CandlestickSeries)
        mainSeries.setData(data as any)

        // Register with context
        setMainChart(newChart)
        setMainSeries({ candle: mainSeries })

        return () => {
            newChart.remove()
            setMainChart(null)
        }
    }, [data, setMainChart, setMainSeries])

    // Handle crosshair for legend
    const overlaysRef = useRef(overlays)
    overlaysRef.current = overlays
    const overlayDataRef = useRef(overlayDataMap)
    overlayDataRef.current = overlayDataMap

    useEffect(() => {
        if (!chart || !series.candle) return

        const handleCrosshair = (param: any) => {
            const isHovering = param.point !== undefined && param.time !== undefined &&
                param.point.x >= 0 && param.point.x < chartContainerRef.current!.clientWidth &&
                param.point.y >= 0 && param.point.y < chartContainerRef.current!.clientHeight

            if (param.time && isHovering) {
                const mainData = param.seriesData.get(series.candle) as any
                if (mainData) {
                    setMainLegend({
                        open: mainData.open,
                        high: mainData.high,
                        low: mainData.low,
                        close: mainData.close,
                    })
                }

                // Update overlay legends from their series (read from refs to avoid dep)
                const currentOverlays = overlaysRef.current
                const currentDataMap = overlayDataRef.current
                currentOverlays.forEach(overlay => {
                    const od = currentDataMap[overlay.id]
                    if (!od?.series) return

                    if (overlay.type === 'volume') {
                        const vData = param.seriesData.get(od.series) as HistogramData<Time> | undefined
                        if (vData?.value !== undefined) {
                            setOverlayLegend(overlay.id, { volume: vData.value })
                        }
                    }
                    if (overlay.type === 'sma' || overlay.type === 'ema') {
                        const lineData = param.seriesData.get(od.series) as LineData<Time> | undefined
                        if (lineData?.value !== undefined) {
                            setOverlayLegend(overlay.id, { value: lineData.value })
                        }
                    }
                })
            } else {
                setMainLegend(null)
                const currentOverlays = overlaysRef.current
                currentOverlays.forEach(overlay => {
                    setOverlayLegend(overlay.id, undefined)
                })
            }
        }

        chart.subscribeCrosshairMove(handleCrosshair)
        return () => chart.unsubscribeCrosshairMove(handleCrosshair)
    }, [chart, series.candle, setMainLegend, setOverlayLegend])

    // Overlay visibility
    useEffect(() => {
        if (!chart) return

        const volumeOverlays = overlays.filter(o => o.type === 'volume')
        const anyVolumeVisible = volumeOverlays.some(o => o.visible)

        // Adjust main chart margins based on whether any volume is visible
        if (anyVolumeVisible) {
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.1, bottom: 0.2 },
            })
        } else {
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.1, bottom: 0 },
            })
        }

        // Update volume overlays visibility
        volumeOverlays.forEach(overlay => {
            const od = overlayDataMap[overlay.id]
            if (!od?.series) return
            od.series.applyOptions({ visible: overlay.visible })
            if (overlay.visible) {
                od.series.priceScale().applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 },
                })
            }
        })

        // Update SMA/EMA overlays visibility
        overlays.filter(o => (o.type === 'sma' || o.type === 'ema')).forEach(overlay => {
            const od = overlayDataMap[overlay.id]
            if (!od?.series) return
            od.series.applyOptions({ visible: overlay.visible })
        })
    }, [chart, overlays, overlayDataMap])

    // Render cross signal markers on the candlestick series
    const maOverlaysWithSignals = useMemo(() => {
        return overlays.filter(o =>
            (o.type === 'sma' || o.type === 'ema') && o.visible &&
            (o.config as SMAConfig | EMAConfig).showCrossSignals &&
            overlayDataMap[o.id]?.data?.length > 0
        );
    }, [overlays, overlayDataMap]);

    useEffect(() => {
        if (!series.candle) return;

        const allMarkers: { time: string; position: 'belowBar' | 'aboveBar'; color: string; shape: 'arrowUp' | 'arrowDown'; text: string }[] = [];

        maOverlaysWithSignals.forEach(overlay => {
            const od = overlayDataMap[overlay.id];
            if (!od?.data) return;

            const crosses = findMACrosses(data, od.data);
            const config = overlay.config as SMAConfig | EMAConfig;
            const label = overlay.type === 'sma' ? `SMA${config.period}` : `EMA${config.period}`;

            crosses.forEach(cross => {
                allMarkers.push({
                    time: cross.date,
                    position: cross.type === 'bullish' ? 'belowBar' : 'aboveBar',
                    color: cross.type === 'bullish' ? '#26A69A' : '#EF5350',
                    shape: cross.type === 'bullish' ? 'arrowUp' : 'arrowDown',
                    text: `${cross.type === 'bullish' ? 'Bull' : 'Bear'} ${label}`,
                });
            });
        });

        allMarkers.sort((a, b) => a.time.localeCompare(b.time));

        const plugin = createSeriesMarkers(series.candle, allMarkers as any);

        return () => {
            plugin.detach();
        };
    }, [series.candle, data, maOverlaysWithSignals, overlayDataMap]);

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~">
                <div un-flex="~ items-center gap-2" un-bg="slate-50" un-p="2 r-4" un-border="~ slate-200 rounded-lg">
                    <Settings size={16} un-mr='2' />
                    <AddButton onClick={() => addOverlay('volume')}>
                        + Volume
                    </AddButton>
                    <AddButton onClick={() => addOverlay('sma')}>
                        + SMA
                    </AddButton>
                    <AddButton onClick={() => addOverlay('ema')}>
                        + EMA
                    </AddButton>
                    <AddButton onClick={() => addIndicator('macd')}>
                        + MACD
                    </AddButton>
                </div>
            </div>

            <div un-flex="~ gap-4">
                <div
                    un-w="6xl"
                    un-h="xl"
                    un-border="~ slate-200"
                    un-shadow="sm"
                    un-position='relative'
                >
                    <ChartLegend />
                    <div ref={chartContainerRef} un-h='full' />
                </div>

                <TechnicalSignals />
            </div>

            <AuxiliaryChart />
        </div>
    )
}

export function AnalysisChart({ data }: AnalysisChartProps) {
    return (
        <ChartProvider initialData={data}>
            <AnalysisChartInner />
        </ChartProvider>
    )
}
