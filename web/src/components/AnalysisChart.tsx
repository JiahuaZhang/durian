import { CandlestickSeries, createChart, HistogramData, HistogramSeries, Time } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
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

type Legend = CandleData | null;

export function AnalysisChart({ data }: AnalysisChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const [legend, setLegend] = useState<Legend>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current)

        const mainSeries = chart.addSeries(CandlestickSeries)
        mainSeries.setData(data as any)

        const volumeSeries = chart.addSeries(HistogramSeries,
            {
                priceScaleId: '',
                lastValueVisible: false,
                priceLineVisible: false,
            }
        );

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

        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                const mainData = param.seriesData.get(mainSeries)
                const volumeData = param.seriesData.get(volumeSeries) as HistogramData<Time> | undefined
                const legendData = {
                    ...mainData,
                    volume: volumeData?.value,
                } as Legend
                setLegend(legendData)
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
    }, [data])

    return (
        <div>
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
        </div>
    )
}
