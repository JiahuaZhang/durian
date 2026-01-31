import { CandlestickSeries, createChart, HistogramData, HistogramSeries, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { calcMACD, findMACDCrosses, findMACDDivergences, MACDData } from '../utils/analysis';
import { ChartLegend } from './ChartLegend';

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

type ChartConfig = {
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
    const [config, setConfig] = useState<ChartConfig>({ showVolume: true, showMACD: false })
    const [legend, setLegend] = useState<CandleData | null>(null)
    const [macdLegend, setMacdLegend] = useState<MACDData | null>(null)
    const syncingRef = useRef(false)

    const macdData = useMemo(() => calcMACD(data), [data])
    const macdCrosses = useMemo(() => findMACDCrosses(macdData), [macdData])
    const macdDivergences = useMemo(() => findMACDDivergences(data, macdData), [data, macdData])
    const [showAllCrosses, setShowAllCrosses] = useState(false)
    const [showAllDivergences, setShowAllDivergences] = useState(false)

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

        const histogramSeries = newMacdChart.addSeries(HistogramSeries, {
            priceLineVisible: false,
            lastValueVisible: false,
        })
        histogramSeries.setData(macdData.filter(d => d.histogram !== undefined).map(d => ({
            time: d.time,
            value: d.histogram,
            color: (d.histogram ?? 0) >= 0 ? '#26a69a' : '#ef5350'
        })) as any)

        const macdLineSeries = newMacdChart.addSeries(LineSeries, {
            color: '#2962FF',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        })
        macdLineSeries.setData(macdData.map(d => ({ time: d.time, value: d.macd })) as any)

        const signalLineSeries = newMacdChart.addSeries(LineSeries, {
            color: '#FF6D00',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        })
        signalLineSeries.setData(macdData.map(d => ({ time: d.time, value: d.signal })) as any)

        macdSeriesRef.current = { histogram: histogramSeries, macd: macdLineSeries, signal: signalLineSeries }
        setMacdChart(newMacdChart)

        return () => {
            newMacdChart.remove()
            setMacdChart(null)
        }
    }, [macdData])

    useEffect(() => {
        if (!macdChart) return

        macdChart.resize(macdContainerRef.current!.clientWidth, macdContainerRef.current!.clientHeight)
    }, [macdChart, config.showMACD])

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
                if (config.showVolume) {
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
    }, [chart, config])

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

        if (config.showVolume) {
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
    }, [chart, config])

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~">
                <div un-flex="~ items-center gap-2" un-bg="slate-50" un-p="2 r-4" un-border="~ slate-200 rounded-lg">
                    <Settings2 size={16} un-mr='2' />
                    <ToggleButton active={config.showVolume} onClick={() => setConfig(p => ({ ...p, showVolume: !p.showVolume }))}>
                        Volume
                    </ToggleButton>
                    <ToggleButton active={config.showMACD} onClick={() => setConfig(p => ({ ...p, showMACD: !p.showMACD }))}>
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

                <div un-min-w="xs" un-shrink="0" un-max-h="xl" un-border="~ slate-200 rounded-lg" un-bg="slate-50" un-p="3" un-flex="~ col gap-3" un-overflow="y-auto">
                    <div un-flex='~ col gap-2'>
                        <div un-text="sm center">MACD Crosses</div>
                        <div un-flex="~ col gap-1" un-max-h="3xs" un-overflow="y-auto" un-border="none" >
                            {(showAllCrosses ? macdCrosses : macdCrosses.slice(0, 5)).map((cross, i) => (
                                <div key={i} un-flex="~ items-center gap-2" un-text="xs" un-p="1.5" un-bg="white" un-border="rounded">
                                    <span un-text={cross.type === 'golden' ? 'green-600' : 'red-600'} un-w="16">
                                        {cross.type === 'golden' ? '↗ Golden' : '↘ Dead'}
                                    </span>
                                    <span un-text="slate-600" un-flex="1">{cross.date}</span>
                                    <span un-text="blue-600 right" un-w="12">{cross.macdValue.toFixed(1)}</span>
                                    {cross.daysSinceLastCross && (
                                        <span un-text="slate-400 right" un-w="8">{cross.daysSinceLastCross}d</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {macdCrosses.length > 5 && (
                            <button
                                onClick={() => setShowAllCrosses(p => !p)}
                                un-flex="~ items-center justify-center gap-1"
                                un-text="xs slate-500 hover:slate-700"
                                un-cursor="pointer"
                            >
                                {showAllCrosses ? (
                                    <><ChevronUp size={14} /> Show less</>
                                ) : (
                                    <><ChevronDown size={14} /> Show all ({macdCrosses.length})</>
                                )}
                            </button>
                        )}
                    </div>

                    <div un-border="t slate-200" un-pt="3" un-flex='~ col gap-2' >
                        <div un-text="sm center" >MACD Divergences</div>
                        <div un-max-h='3xs' un-overflow='y-auto' un-flex="~ col gap-1">
                            {(showAllDivergences ? macdDivergences : macdDivergences.slice(0, 5)).map((div, i) => (
                                <div key={i} un-flex="~ col gap-1" un-text="xs" un-p="1.5" un-bg="white" un-border="rounded">
                                    <div un-flex="~ items-center gap-2 justify-between">
                                        <span un-text={div.type === 'bullish' ? 'green-600' : 'red-600'}>
                                            {div.type === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
                                        </span>
                                        <span un-text="slate-500">{div.startDate} → {div.endDate}</span>
                                    </div>
                                    <div un-text="slate-400" un-flex="~ items-center gap-2 justify-between">
                                        <div> Price: </div>
                                        <div>
                                            <span un-text={div.type === 'bullish' ? 'green-600' : 'red-600'} >
                                                {div.startPrice.toFixed(1)}
                                            </span>
                                            <span un-text={div.type === 'bullish' ? 'red-600' : 'green-600'} >
                                                {' '} → {div.endPrice.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                    <div un-text="slate-400" un-flex="~ items-center gap-2 justify-between">
                                        <div> MACD: </div>
                                        <div>
                                            <span un-text={div.type === 'bullish' ? 'red-600' : 'green-600'}>
                                                {div.startMacd.toFixed(1)}
                                            </span>
                                            <span un-text={div.type === 'bullish' ? 'green-600' : 'red-600'}>
                                                {' '} → {div.endMacd.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {macdDivergences.length === 0 && (
                                <div un-text="xs slate-400" un-p="2">No divergences detected</div>
                            )}
                        </div>
                        {macdDivergences.length > 5 && (
                            <button
                                onClick={() => setShowAllDivergences(p => !p)}
                                un-flex="~ items-center justify-center gap-1"
                                un-text="xs slate-500 hover:slate-700"
                                un-cursor="pointer"
                            >
                                {showAllDivergences ? (
                                    <><ChevronUp size={14} /> Show less</>
                                ) : (
                                    <><ChevronDown size={14} /> Show all ({macdDivergences.length})</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div
                un-w="6xl"
                un-h={config.showMACD ? '40' : '0'}
                un-border={config.showMACD ? "~ slate-200" : "none"}
                un-shadow="sm"
                un-position='relative'
            >
                {config.showMACD && macdLegend && (
                    <div un-position="absolute top-2 left-2 z-10" un-text="xs" un-flex="~ gap-3">
                        <span>MACD 12 26 9</span>
                        <span un-text="blue-600">{macdLegend.macd?.toFixed(2)}</span>
                        <span un-text="orange-600">{macdLegend.signal?.toFixed(2)}</span>
                        <span un-text={(macdLegend.histogram ?? 0) >= 0 ? 'green-600' : 'red-600'}>{macdLegend.histogram?.toFixed(2)}</span>
                    </div>
                )}
                <div ref={macdContainerRef} un-h='full' />
            </div>
        </div>
    )
}
