import { CandlestickSeries, createChart, HistogramData, HistogramSeries, LineData, LineSeries, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { EMA, SMA } from 'technicalindicators';
import { CandleData, ChartProvider, EMAConfig, SMAConfig, useIndicators, useMainChart, useOverlays, VolumeConfig } from '../contexts/ChartContext';
import { AuxiliaryChart } from './AuxiliaryChart';
import { ChartLegend } from './ChartLegend';
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
    const { data, chart, series, setMainChart, setMainSeries, setMainLegend } = useMainChart()
    const { overlays, addOverlay, updateOverlay, setOverlayLegend } = useOverlays()
    const { addIndicator } = useIndicators()

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

                updateOverlay(overlay.id, { data: seriesData })
            }
        })
    }, [chart, data, overlays])

    // Handle crosshair for legend
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

                // Update overlay legends from their series
                overlays.filter(o => o.series).forEach(overlay => {
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
                overlays.forEach(overlay => {
                    setOverlayLegend(overlay.id, undefined)
                })
            }
        }

        chart.subscribeCrosshairMove(handleCrosshair)
        return () => chart.unsubscribeCrosshairMove(handleCrosshair)
    }, [chart, series.candle, overlays, setMainLegend, setOverlayLegend])

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
