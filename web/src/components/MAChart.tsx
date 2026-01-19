import { CandlestickSeries, createChart, HistogramSeries, ISeriesApi, LineSeries } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { EMA, SMA } from 'technicalindicators'

export type CandleData = {
    time: string
    open: number
    high: number
    low: number
    close: number
    volume: number
    adjustClose: number
}

export type Indicator = {
    id: string
    type: 'SMA' | 'EMA'
    period: number
    color: string
    label: string
}

export const DEFAULT_INDICATORS: Indicator[] = [
    { id: 'sma5', type: 'SMA', period: 5, color: '#2962FF', label: '5 SMA' },
    { id: 'sma10', type: 'SMA', period: 10, color: '#00BCD4', label: '10 SMA' },
    { id: 'sma20', type: 'SMA', period: 20, color: '#FF9800', label: '20 SMA' },
    { id: 'sma50', type: 'SMA', period: 50, color: '#F44336', label: '50 SMA' },
    { id: 'sma200', type: 'SMA', period: 200, color: '#333333', label: '200 SMA' },
    { id: 'ema9', type: 'EMA', period: 9, color: '#9C27B0', label: '9 EMA' },
    { id: 'ema20', type: 'EMA', period: 20, color: '#3F51B5', label: '20 EMA' },
    { id: 'ema50', type: 'EMA', period: 50, color: '#E91E63', label: '50 EMA' },
]

type MAChartProps = {
    data: CandleData[]
    title?: string
    indicators?: Indicator[]
    defaultActiveIndicators?: string[]
}

type Legend = (CandleData & Record<string, number>) | null;


export const UnoTrick = <div un-bg='#2962FF #00BCD4 #FF9800 #333333 #F44336 #E91E63 #3F51B5 #9C27B0'
    un-text='#2962FF #00BCD4 #FF9800 #333333 #F44336 #E91E63 #3F51B5 #9C27B0' />

const formatPrice = (val: number) => val.toFixed(2)
const formatVol = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B'
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M'
    if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K'
    return val.toString()
}
const getColor = (d: CandleData) => d.close >= d.open ? '#26a69a' : '#ef5350'

export function MAChart({ data, title = 'SPX', indicators = DEFAULT_INDICATORS, defaultActiveIndicators }: MAChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const seriesCache = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const [legend, setLegend] = useState<Legend>(null)
    const [activeToggles, setActiveToggles] = useState<Set<string>>(new Set(defaultActiveIndicators || ['sma20', 'sma50', 'ema20']))

    const toggleIndicator = (id: string) => {
        setActiveToggles(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const isActive = (id: string) => activeToggles.has(id)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current)
        seriesCache.current.clear()

        const mainSeries = chart.addSeries(CandlestickSeries)
        mainSeries.setData(data as any)
        const seriesIdMap = new Map()
        seriesIdMap.set(mainSeries, 'candle')

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            lastValueVisible: false,
        });
        seriesIdMap.set(volumeSeries, 'volume')

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        volumeSeries.setData(data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? '#26a69a' : '#ef5350'
        })) as any);

        const closePrices = data.map(d => d.close)

        indicators.forEach(ind => {
            let calculatedValues: number[] = []
            if (ind.type === 'SMA') {
                calculatedValues = SMA.calculate({ period: ind.period, values: closePrices })
            } else if (ind.type === 'EMA') {
                calculatedValues = EMA.calculate({ period: ind.period, values: closePrices })
            }

            if (!calculatedValues.length) return;

            const series = chart.addSeries(LineSeries, {
                color: ind.color,
                lineWidth: 2,
                lineStyle: ind.type === 'EMA' ? 2 : 0,
                lastValueVisible: false,
                priceLineVisible: false,
                visible: activeToggles.has(ind.id),
                crosshairMarkerVisible: true
            })

            const seriesData = data.slice(ind.period - 1)
                .map((d, i) => ({
                    time: d.time as any,
                    value: calculatedValues[i]
                }))
            series.setData(seriesData)

            seriesCache.current.set(ind.id, series)
            seriesIdMap.set(series, ind.id)
        })

        chart.subscribeCrosshairMove((param) => {
            let nextLegend = {} as Legend;

            if (param.time) {
                param.seriesData.forEach((value, series) => {
                    const id = seriesIdMap.get(series)
                    if (id === 'candle') {
                        nextLegend = { ...nextLegend, ...value } as object as Legend
                    } else {
                        nextLegend = { ...nextLegend, [id]: (value as any).value } as Legend
                    }
                })
                setLegend(nextLegend)
            } else {
                setLegend(null)
            }

            const isHovering = param.point !== undefined && param.time !== undefined &&
                param.point.x >= 0 && param.point.x < chartContainerRef.current!.clientWidth &&
                param.point.y >= 0 && param.point.y < chartContainerRef.current!.clientHeight;

            if (!isHovering) {
                setLegend(null)
            }
        });

        return () => chart.remove()
    }, [data, title, indicators])

    useEffect(() => {
        seriesCache.current.forEach((series, id) => {
            series.applyOptions({
                visible: activeToggles.has(id)
            })
        })
    }, [activeToggles])

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~ gap-2">
                {indicators.map((ind) => (
                    <button
                        key={ind.id}
                        onClick={() => toggleIndicator(ind.id)}
                        un-p="x-3 y-1"
                        un-cursor='pointer'
                        un-rounded="lg"
                        un-text={`sm ${isActive(ind.id) ? 'white' : ind.color}`}
                        un-border={isActive(ind.id) ? 'transparent' : '~ slate-200'}
                        un-bg={isActive(ind.id) ? ind.color : 'transparent hover:slate-50'}
                    >
                        {ind.label}
                    </button>
                ))}
            </div>

            <div
                un-w="6xl"
                un-h="xl"
                un-border="~ slate-200 rounded"
                un-shadow="sm"
                un-position='relative'
            >
                {legend && (
                    <div un-position="absolute top-2 left-2" un-z="10" un-flex="~ wrap gap-2" un-text="xs" un-font="mono" un-max-w='md'>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">O</span>
                            <span un-text={getColor(legend)}>{formatPrice(legend.open)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">H</span>
                            <span un-text={getColor(legend)}>{formatPrice(legend.high)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">L</span>
                            <span un-text={getColor(legend)}>{formatPrice(legend.low)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">C</span>
                            <span un-text={getColor(legend)}>{formatPrice(legend.close)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">V</span>
                            <span un-text={getColor(legend)}>{formatVol(legend.volume)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text={legend.close >= legend.open ? 'green-500' : 'red-500'}>
                                {(legend.close - legend.open).toFixed(2)} ({((legend.close - legend.open) / legend.open * 100).toFixed(2)}%)
                            </span>
                        </div>
                        {indicators.map((ind) => {
                            if (!activeToggles.has(ind.id)) return null;

                            const val = (legend as any)[ind.id] as number | undefined
                            if (val === undefined) return null
                            return (
                                <div key={ind.id} un-flex="~ gap-1">
                                    <span un-text={ind.color}>{ind.label}</span>
                                    <span un-text={ind.color}>{val.toFixed(2)}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
                <div
                    ref={chartContainerRef}
                    un-w="full"
                    un-h="full"
                    un-rounded="xl"
                />
            </div>
        </div>
    )
}
