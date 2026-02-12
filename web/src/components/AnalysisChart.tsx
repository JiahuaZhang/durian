import { CandlestickSeries, createChart, createSeriesMarkers, HistogramData, HistogramSeries, LineData, LineSeries, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { EMA, SMA } from 'technicalindicators';
import type { CandleData } from '../contexts/ChartContext';
import { ChartProvider, EMAConfig, SMAConfig, useCandleData, useIndicators, useLegend, useMainChart, useOverlays, VolumeConfig } from '../contexts/ChartContext';
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
    const { overlays, addOverlay, updateOverlay } = useOverlays()
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

    // Track previous overlays to detect removals
    const prevOverlaysRef = useRef(overlays)

    // Handle overlay series (volume, etc.) - react to overlay changes
    useEffect(() => {
        if (!chart || !data.length) return

        // Detect and clean up removed overlays
        const currentIds = new Set(overlays.map(o => o.id))
        prevOverlaysRef.current.forEach(prevOverlay => {
            if (!currentIds.has(prevOverlay.id) && prevOverlay.series) {
                // This overlay was removed - clean up its series from the chart
                chart.removeSeries(prevOverlay.series)
            }
        })
        prevOverlaysRef.current = overlays

        // Process each overlay that doesn't have a series yet
        overlays.forEach(overlay => {
            if (overlay.series) return; // Already has series

            if (overlay.type === 'volume') {
                const config = overlay.config as VolumeConfig
                const volumeSeries = chart.addSeries(HistogramSeries, {
                    priceScaleId: '',
                    lastValueVisible: false,
                    priceLineVisible: false,
                })

                volumeSeries.setData(data.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.close >= d.open ? config.upColor : config.downColor
                })) as any)

                updateOverlay(overlay.id, { series: volumeSeries })
            }

            if (overlay.type === 'sma' || overlay.type === 'ema') {
                const config = overlay.config as SMAConfig | EMAConfig
                const closePrices = data.map(d => d.close)

                const calculatedValues = overlay.type === 'sma'
                    ? SMA.calculate({ period: config.period, values: closePrices })
                    : EMA.calculate({ period: config.period, values: closePrices })

                if (!calculatedValues.length) return

                const maSeries = chart.addSeries(LineSeries, {
                    color: config.color,
                    lineWidth: config.lineWidth as 1 | 2 | 3 | 4,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    crosshairMarkerVisible: true,
                })

                const seriesData = data.slice(config.period - 1).map((d, i) => ({
                    time: d.time as unknown as Time,
                    value: calculatedValues[i]
                }))
                maSeries.setData(seriesData)

                updateOverlay(overlay.id, { series: maSeries, data: seriesData })
            }
        })
    }, [chart, data, overlays, updateOverlay])

    // Update overlay series when config changes
    useEffect(() => {
        if (!chart || !data.length) return

        overlays.forEach(overlay => {
            if (!overlay.series) return

            if (overlay.type === 'volume') {
                const config = overlay.config as VolumeConfig
                overlay.series.setData(data.map(d => ({
                    time: d.time,
                    value: d.volume,
                    color: d.close >= d.open ? config.upColor : config.downColor
                })) as any)
            }

            if (overlay.type === 'sma' || overlay.type === 'ema') {
                const config = overlay.config as SMAConfig | EMAConfig
                const closePrices = data.map(d => d.close)

                const calculatedValues = overlay.type === 'sma'
                    ? SMA.calculate({ period: config.period, values: closePrices })
                    : EMA.calculate({ period: config.period, values: closePrices })

                if (!calculatedValues.length) return

                // Update line style options
                overlay.series.applyOptions({
                    color: config.color,
                    lineWidth: config.lineWidth as 1 | 2 | 3 | 4,
                })

                // Recalculate and set data
                const seriesData = data.slice(config.period - 1).map((d, i) => ({
                    time: d.time as unknown as Time,
                    value: calculatedValues[i]
                }))
                overlay.series.setData(seriesData)

                if (!overlay.data) {
                    updateOverlay(overlay.id, { data: seriesData })
                }
            }
        })
    }, [chart, data, overlays])

    // Handle crosshair for legend
    // KEY FIX: Use a ref to track current overlays so the crosshair handler
    // doesn't need `overlays` in its dependency array. This breaks the infinite loop.
    const overlaysRef = useRef(overlays)
    overlaysRef.current = overlays

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

                // Update overlay legends from their series (read from ref to avoid dep)
                const currentOverlays = overlaysRef.current
                currentOverlays.filter(o => o.series).forEach(overlay => {
                    if (overlay.type === 'volume') {
                        const vData = param.seriesData.get(overlay.series) as HistogramData<Time> | undefined
                        if (vData?.value !== undefined) {
                            setOverlayLegend(overlay.id, { volume: vData.value })
                        }
                    }
                    if (overlay.type === 'sma' || overlay.type === 'ema') {
                        const lineData = param.seriesData.get(overlay.series) as LineData<Time> | undefined
                        if (lineData?.value !== undefined) {
                            setOverlayLegend(overlay.id, { value: lineData.value })
                        }
                    }
                })
            } else {
                setMainLegend(null)
                // Clear all overlay legends
                const currentOverlays = overlaysRef.current
                currentOverlays.forEach(overlay => {
                    setOverlayLegend(overlay.id, undefined)
                })
            }
        }

        chart.subscribeCrosshairMove(handleCrosshair)
        return () => chart.unsubscribeCrosshairMove(handleCrosshair)
    }, [chart, series.candle, setMainLegend, setOverlayLegend])

    // Overlay visibility - handle each overlay's visibility
    useEffect(() => {
        if (!chart) return

        const volumeOverlays = overlays.filter(o => o.type === 'volume' && o.series)
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
            overlay.series?.applyOptions({ visible: overlay.visible })
            if (overlay.visible) {
                overlay.series?.priceScale().applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 },
                })
            }
        })

        // Update SMA/EMA overlays visibility
        overlays.filter(o => (o.type === 'sma' || o.type === 'ema') && o.series).forEach(overlay => {
            overlay.series?.applyOptions({ visible: overlay.visible })
        })
    }, [chart, overlays])

    // Render cross signal markers on the candlestick series
    const maOverlaysWithSignals = useMemo(() => {
        return overlays.filter(o =>
            (o.type === 'sma' || o.type === 'ema') && o.visible && o.data &&
            (o.config as SMAConfig | EMAConfig).showCrossSignals
        );
    }, [overlays]);

    useEffect(() => {
        if (!series.candle) return;

        const allMarkers: { time: string; position: 'belowBar' | 'aboveBar'; color: string; shape: 'arrowUp' | 'arrowDown'; text: string }[] = [];

        maOverlaysWithSignals.forEach(overlay => {
            const crosses = findMACrosses(data, overlay.data);
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
    }, [series.candle, data, maOverlaysWithSignals]);

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
