import { CandlestickSeries, createChart, HistogramData, HistogramSeries, ISeriesApi, Time } from 'lightweight-charts';
import { Settings2 } from 'lucide-react';
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

type ChartConfig = {
    showVolume: boolean;
}

export function AnalysisChart({ data }: AnalysisChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const seriesRef = useRef<{
        main?: ISeriesApi<"Candlestick">,
        volume?: ISeriesApi<"Histogram">
    }>({})
    const [chart, setChart] = useState<ReturnType<typeof createChart> | null>(null)
    const [config, setConfig] = useState<ChartConfig>({ showVolume: true })
    const [legend, setLegend] = useState<CandleData | null>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const newChart = createChart(chartContainerRef.current)

        const mainSeries = newChart.addSeries(CandlestickSeries)
        mainSeries.setData(data as any)

        const volumeSeries = newChart.addSeries(HistogramSeries,
            {
                priceScaleId: '',
                lastValueVisible: false,
                priceLineVisible: false,
            }
        );

        volumeSeries.setData(data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? '#26a69a' : '#ef5350'
        })) as any);

        seriesRef.current = { main: mainSeries, volume: volumeSeries }
        setChart(newChart)

        return () => {
            newChart.remove()
            setChart(null)
        }
    }, [data])

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
                param.point.y >= 0 && param.point.y < chartContainerRef.current!.clientHeight;

            if (!isHovering) {
                setLegend(null)
            }
        }

        chart.subscribeCrosshairMove(handleCrosshair)
        return () => chart.unsubscribeCrosshairMove(handleCrosshair)
    }, [chart, config])

    useEffect(() => {
        if (!chart) return
        const { main, volume } = seriesRef.current
        if (!main || !volume) return

        if (config.showVolume) {
            chart.priceScale('right').applyOptions({
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2,
                },
            });
            volume.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });
            volume.applyOptions({ visible: true });
        } else {
            chart.priceScale('right').applyOptions({
                scaleMargins: {
                    top: 0.1,
                    bottom: 0,
                },
            });
            volume.applyOptions({ visible: false });
        }
    }, [chart, config])

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~ items-center gap-2" un-bg="slate-50" un-p="2" un-border="~ slate-200 rounded-lg">
                <Settings2 size={16} />
                <button
                    onClick={() => setConfig(p => ({ ...p, showVolume: !p.showVolume }))}
                    un-p="x-3 y-1"
                    un-text={`xs ${config.showVolume ? 'white' : 'slate-600'} `}
                    un-bg={config.showVolume ? 'blue-600' : 'white hover:slate-100'}
                    un-border="~ slate-200 rounded-md"
                    un-shadow="sm"
                    un-cursor="pointer"
                >
                    Volume
                </button>
            </div>

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
