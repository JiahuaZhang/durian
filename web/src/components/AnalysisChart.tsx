import { CandlestickSeries, createChart, createSeriesMarkers, HistogramData, HistogramSeries, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useChartConfig } from '../contexts/ChartConfigContext';
import { calcMACD, findMACDDivergences, MACDData } from '../utils/analysis';
import { ChartConfigPopup } from './ChartConfigPopup';
import { ChartLegend } from './ChartLegend';
import { MACDDivergencePanel, MACDInputPanel, MACDStylePanel } from './MACDConfigPanel';
import { TechnicalSignals } from './TechnicalSignals';

export type CandleData = {
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    adjustClose: number
}

type AnalysisChartProps = {
    data: CandleData[]
}

type DisplayConfig = {
    showVolume: boolean;
    showMACD: boolean;
}

const ToggleButton = ({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) => (
    <button
        onClick={onClick}
        un-p="x-3 y-1"
        un-text={`xs ${active ? 'white' : 'slate-600'}`}
        un-bg={active ? 'blue-600' : 'white hover:slate-100'}
        un-border="~ slate-200 rounded-md"
        un-shadow="sm"
        un-cursor="pointer"
    >
        {children}
    </button>
)

export function AnalysisChart({ data }: AnalysisChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const macdContainerRef = useRef<HTMLDivElement>(null)
    const seriesRef = useRef<{
        main?: ISeriesApi<"Candlestick">,
        volume?: ISeriesApi<"Histogram">
    }>({})
    const macdSeriesRef = useRef<{
        histogram?: ISeriesApi<"Histogram">,
        macd?: ISeriesApi<"Line">,
        signal?: ISeriesApi<"Line">
    }>({})
    const [chart, setChart] = useState<ReturnType<typeof createChart> | null>(null)
    const [macdChart, setMacdChart] = useState<ReturnType<typeof createChart> | null>(null)
    const [displayConfig, setDisplayConfig] = useState<DisplayConfig>({ showVolume: true, showMACD: false })
    const [legend, setLegend] = useState<CandleData | null>(null)
    const [macdLegend, setMacdLegend] = useState<MACDData | null>(null)
    const [macdConfigOpen, setMacdConfigOpen] = useState(false)
    const macdCogRef = useRef<HTMLButtonElement>(null)
    const syncingRef = useRef(false)

    const { config: chartConfig } = useChartConfig()
    const macdConfig = chartConfig.macd

    const macdData = useMemo(() => calcMACD(data, {
        fast: macdConfig.fastPeriod,
        slow: macdConfig.slowPeriod,
        signal: macdConfig.signalPeriod,
    }), [data, macdConfig.fastPeriod, macdConfig.slowPeriod, macdConfig.signalPeriod])

    const divergences = useMemo(() => {
        if (!macdConfig.showDivergences) return []
        return findMACDDivergences(data, macdData, {
            pivotLookbackLeft: macdConfig.pivotLookbackLeft,
            pivotLookbackRight: macdConfig.pivotLookbackRight,
            rangeMin: macdConfig.rangeMin,
            rangeMax: macdConfig.rangeMax,
            dontTouchZero: macdConfig.dontTouchZero,
        })
    }, [data, macdData, macdConfig.showDivergences, macdConfig.pivotLookbackLeft,
        macdConfig.pivotLookbackRight, macdConfig.rangeMin, macdConfig.rangeMax, macdConfig.dontTouchZero])

    useEffect(() => {
        if (!chartContainerRef.current) return

        const newChart = createChart(chartContainerRef.current)

        const mainSeries = newChart.addSeries(CandlestickSeries)
        mainSeries.setData(data as any)

        const volumeSeries = newChart.addSeries(HistogramSeries, {
            priceScaleId: '',
            lastValueVisible: false,
            priceLineVisible: false,
        })

        volumeSeries.setData(data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? '#26a69a' : '#ef5350'
        })) as any)

        seriesRef.current = { main: mainSeries, volume: volumeSeries }
        setChart(newChart)

        return () => {
            newChart.remove()
            setChart(null)
        }
    }, [data])

    useEffect(() => {
        if (!macdContainerRef.current) return

        const newMacdChart = createChart(macdContainerRef.current)

        // 4-color histogram: growing/falling for above/below zero
        const histogramData = macdData.filter(d => d.histogram !== undefined).map((d, i, arr) => {
            const hist = d.histogram ?? 0
            const prevHist = i > 0 ? (arr[i - 1].histogram ?? 0) : 0
            const isGrowing = hist > prevHist

            let color: string
            if (hist >= 0) {
                color = isGrowing ? '#26A69A' : '#B2DFDB' // teal / light teal
            } else {
                color = isGrowing ? '#FFCDD2' : '#FF5252' // light red / red
            }

            return { time: d.time, value: hist, color }
        })

        const histogramSeries = newMacdChart.addSeries(HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: false,
        })
        histogramSeries.setData(histogramData as any)

        const macdLineSeries = newMacdChart.addSeries(LineSeries, {
            color: macdConfig.macdColor,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        })
        macdLineSeries.setData(macdData.map(d => ({ time: d.time, value: d.macd })) as any)

        const signalLineSeries = newMacdChart.addSeries(LineSeries, {
            color: macdConfig.signalColor,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        })
        signalLineSeries.setData(macdData.map(d => ({ time: d.time, value: d.signal })) as any)

        // Add divergence lines and markers
        if (macdConfig.showDivergences && divergences.length > 0) {
            divergences.forEach(div => {
                const color = div.type === 'bullish' ? macdConfig.divergenceBullColor : macdConfig.divergenceBearColor
                const startTime = macdData[div.startIndex]?.time
                const endTime = macdData[div.endIndex]?.time

                if (startTime && endTime) {
                    // Create a line series for this divergence
                    const lineSeries = newMacdChart.addSeries(LineSeries, {
                        color,
                        lineWidth: 2,
                        priceLineVisible: false,
                        lastValueVisible: false,
                        crosshairMarkerVisible: false,
                    })
                    lineSeries.setData([
                        { time: startTime, value: div.startMacd },
                        { time: endTime, value: div.endMacd },
                    ] as any)
                }
            })

            // Create markers for all divergences using createSeriesMarkers
            const markers = divergences
                .map(div => {
                    const endTime = macdData[div.endIndex]?.time
                    if (!endTime) return null
                    return {
                        time: endTime,
                        position: div.type === 'bullish' ? 'belowBar' as const : 'aboveBar' as const,
                        color: div.type === 'bullish' ? macdConfig.divergenceBullColor : macdConfig.divergenceBearColor,
                        shape: div.type === 'bullish' ? 'arrowUp' as const : 'arrowDown' as const,
                        text: div.type === 'bullish' ? 'Bull' : 'Bear',
                    }
                })
                .filter((m): m is NonNullable<typeof m> => m !== null)
                .sort((a, b) => String(a.time).localeCompare(String(b.time)))

            if (markers.length > 0) {
                createSeriesMarkers(macdLineSeries, markers as any)
            }
        }

        macdSeriesRef.current = { histogram: histogramSeries, macd: macdLineSeries, signal: signalLineSeries }
        setMacdChart(newMacdChart)

        return () => {
            newMacdChart.remove()
            setMacdChart(null)
        }
    }, [macdData, divergences, macdConfig.macdColor, macdConfig.signalColor, macdConfig.histogramUpColor, macdConfig.histogramDownColor, macdConfig.showDivergences, macdConfig.divergenceBullColor, macdConfig.divergenceBearColor])

    useEffect(() => {
        if (!macdChart) return

        macdChart.resize(macdContainerRef.current!.clientWidth, macdContainerRef.current!.clientHeight)
    }, [macdChart, displayConfig.showMACD])

    useEffect(() => {
        if (!chart || !macdChart) return

        const handler1 = (range: any) => {
            if (syncingRef.current || !range) return
            syncingRef.current = true
            macdChart.timeScale().setVisibleLogicalRange(range)
            syncingRef.current = false
        }
        const handler2 = (range: any) => {
            if (syncingRef.current || !range) return
            syncingRef.current = true
            chart.timeScale().setVisibleLogicalRange(range)
            syncingRef.current = false
        }

        chart.timeScale().subscribeVisibleLogicalRangeChange(handler1)
        macdChart.timeScale().subscribeVisibleLogicalRangeChange(handler2)

        return () => {
            chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler1)
            macdChart.timeScale().unsubscribeVisibleLogicalRangeChange(handler2)
        }
    }, [chart, macdChart])

    useEffect(() => {
        if (!chart || !macdChart) return
        const { histogram } = macdSeriesRef.current
        const { main } = seriesRef.current
        if (!histogram || !main) return

        const mainToMacd = (param: any) => {
            if (param.time) {
                macdChart.setCrosshairPosition(0, param.time, histogram)
            } else {
                macdChart.clearCrosshairPosition()
            }
        }
        const macdToMain = (param: any) => {
            if (param.time) {
                chart.setCrosshairPosition(0, param.time, main)
            } else {
                chart.clearCrosshairPosition()
            }
        }

        chart.subscribeCrosshairMove(mainToMacd)
        macdChart.subscribeCrosshairMove(macdToMain)

        return () => {
            chart.unsubscribeCrosshairMove(mainToMacd)
            macdChart.unsubscribeCrosshairMove(macdToMain)
        }
    }, [chart, macdChart])

    useEffect(() => {
        if (!chart) return

        const { main, volume } = seriesRef.current
        if (!main || !volume) return

        const handleCrosshair = (param: any) => {
            if (param.time) {
                const mainData = param.seriesData.get(main) as any

                let volumeVal = undefined
                if (displayConfig.showVolume) {
                    const vData = param.seriesData.get(volume) as HistogramData<Time> | undefined
                    volumeVal = vData?.value
                }

                setLegend({
                    ...mainData,
                    volume: volumeVal,
                })
            } else {
                setLegend(null)
            }

            const isHovering = param.point !== undefined && param.time !== undefined &&
                param.point.x >= 0 && param.point.x < chartContainerRef.current!.clientWidth &&
                param.point.y >= 0 && param.point.y < chartContainerRef.current!.clientHeight

            if (!isHovering) setLegend(null)
        }

        chart.subscribeCrosshairMove(handleCrosshair)
        return () => chart.unsubscribeCrosshairMove(handleCrosshair)
    }, [chart, displayConfig])

    useEffect(() => {
        if (!macdChart) return

        const { histogram, macd, signal } = macdSeriesRef.current
        if (!histogram || !macd || !signal) return

        const handleCrosshair = (param: any) => {
            if (param.time) {
                const h = param.seriesData.get(histogram) as any
                const m = param.seriesData.get(macd) as any
                const s = param.seriesData.get(signal) as any
                setMacdLegend({
                    time: param.time,
                    histogram: h?.value,
                    macd: m?.value,
                    signal: s?.value,
                })
            } else {
                setMacdLegend(null)
            }
        }

        macdChart.subscribeCrosshairMove(handleCrosshair)
        return () => macdChart.unsubscribeCrosshairMove(handleCrosshair)
    }, [macdChart])

    useEffect(() => {
        if (!chart) return
        const { main, volume } = seriesRef.current
        if (!main || !volume) return

        if (displayConfig.showVolume) {
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.1, bottom: 0.2 },
            })
            volume.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            })
            volume.applyOptions({ visible: true })
        } else {
            chart.priceScale('right').applyOptions({
                scaleMargins: { top: 0.1, bottom: 0 },
            })
            volume.applyOptions({ visible: false })
        }
    }, [chart, displayConfig])

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~">
                <div un-flex="~ items-center gap-2" un-bg="slate-50" un-p="2 r-4" un-border="~ slate-200 rounded-lg">
                    <Settings size={16} un-mr='2' />
                    <ToggleButton active={displayConfig.showVolume} onClick={() => setDisplayConfig(p => ({ ...p, showVolume: !p.showVolume }))}>
                        Volume
                    </ToggleButton>
                    <ToggleButton active={displayConfig.showMACD} onClick={() => setDisplayConfig(p => ({ ...p, showMACD: !p.showMACD }))}>
                        MACD
                    </ToggleButton>
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
                    <ChartLegend legend={legend} />
                    <div ref={chartContainerRef} un-h='full' />
                </div>

                <TechnicalSignals data={data} macdData={macdData} />
            </div>

            <div
                un-w="6xl"
                un-h={displayConfig.showMACD ? '60' : '0'}
                un-border={displayConfig.showMACD ? "~ slate-200" : "none"}
                un-shadow="sm"
                un-position='relative'
            >
                {displayConfig.showMACD && (
                    <div un-position="absolute top-2 left-2 z-10" un-text="xs" un-flex="~ items-center gap-2">
                        <button
                            ref={macdCogRef}
                            onClick={() => setMacdConfigOpen(p => !p)}
                            un-p="1"
                            un-cursor="pointer"
                            un-text="slate-400 hover:slate-600"
                            un-bg="transparent hover:slate-100"
                            un-border="rounded"
                        >
                            <Settings size={14} />
                        </button>
                        <span>MACD {macdConfig.fastPeriod} {macdConfig.slowPeriod} {macdConfig.signalPeriod}</span>
                        {macdLegend && (
                            <>
                                <span un-text="blue-600">{macdLegend.macd?.toFixed(2)}</span>
                                <span un-text="orange-600">{macdLegend.signal?.toFixed(2)}</span>
                                <span un-text={(macdLegend.histogram ?? 0) >= 0 ? 'green-600' : 'red-600'}>{macdLegend.histogram?.toFixed(2)}</span>
                            </>
                        )}
                        <ChartConfigPopup
                            title="MACD Settings"
                            isOpen={macdConfigOpen}
                            onClose={() => setMacdConfigOpen(false)}
                            triggerRef={macdCogRef}
                            tabs={[
                                { id: 'input', label: 'Input', content: <MACDInputPanel /> },
                                { id: 'style', label: 'Style', content: <MACDStylePanel /> },
                                { id: 'divergence', label: 'Divergence', content: <MACDDivergencePanel /> },
                            ]}
                        />
                    </div>
                )}
                <div ref={macdContainerRef} un-h='full' />
            </div>
        </div>
    )
}
