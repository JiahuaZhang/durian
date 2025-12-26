import { CandlestickSeries, createChart, IChartApi, LineSeries, SeriesDataItemTypeMap } from 'lightweight-charts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EMA, SMA } from 'technicalindicators'

export type CandleData = {
    time: string
    open: number
    high: number
    low: number
    close: number
}

type MAChartProps = {
    data: CandleData[]
    title?: string
}

const AVAILABLE_INDICATORS = [
    { id: 'sma5', type: 'SMA', period: 5, color: '#2962FF', label: '5 SMA' },
    { id: 'sma10', type: 'SMA', period: 10, color: '#00BCD4', label: '10 SMA' },
    { id: 'sma20', type: 'SMA', period: 20, color: '#FF9800', label: '20 SMA' },
    { id: 'sma50', type: 'SMA', period: 50, color: '#F44336', label: '50 SMA' },
    { id: 'sma200', type: 'SMA', period: 200, color: '#333333', label: '200 SMA' },
    { id: 'ema9', type: 'EMA', period: 9, color: '#9C27B0', label: '9 EMA' },
    { id: 'ema20', type: 'EMA', period: 20, color: '#3F51B5', label: '20 EMA' },
    { id: 'ema50', type: 'EMA', period: 50, color: '#E91E63', label: '50 EMA' },
] as const

export const UnoTrick = <div un-bg='#2962FF #00BCD4 #FF9800 #333333 #F44336 #E91E63 #3F51B5 #9C27B0'
    un-text='#2962FF #00BCD4 #FF9800 #333333 #F44336 #E91E63 #3F51B5 #9C27B0' />

export function MAChart({ data, title = 'SPX' }: MAChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const indicatorCache = useMemo(() => new Map<string, SeriesDataItemTypeMap['Line'][]>(), [data]);

    const [activeToggles, setActiveToggles] = useState<Set<string>>(new Set(['sma20', 'sma50', 'ema20']))

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
        chartRef.current = chart

        const mainSeries = chart.addSeries(CandlestickSeries)
        mainSeries.setData(data as any)

        const closePrices = data.map(d => d.close)

        AVAILABLE_INDICATORS.forEach(ind => {
            if (!activeToggles.has(ind.id)) return;

            let seriesData = indicatorCache.get(ind.id);

            if (!seriesData) {
                let calculatedValues: number[] = [];
                if (ind.type === 'SMA') {
                    calculatedValues = SMA.calculate({ period: ind.period, values: closePrices })
                } else if (ind.type === 'EMA') {
                    calculatedValues = EMA.calculate({ period: ind.period, values: closePrices })
                }

                if (calculatedValues.length > 0) {
                    const offset = ind.period - 1
                    seriesData = data.slice(offset).map((d, i) => ({
                        time: d.time as any,
                        value: calculatedValues[i]
                    }));
                    indicatorCache.set(ind.id, seriesData);
                }
            }

            if (seriesData) {
                const series = chart.addSeries(LineSeries, {
                    color: ind.color,
                    lineWidth: 2,
                    lineStyle: ind.type === 'EMA' ? 2 : 0,
                    lastValueVisible: false,
                    priceLineVisible: false,
                })

                series.setData(seriesData)
            }
        })

        return chart.remove;

    }, [activeToggles, data, title, indicatorCache])

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~ gap-2">
                {AVAILABLE_INDICATORS.map((ind) => (
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
