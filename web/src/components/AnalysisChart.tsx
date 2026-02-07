import { CandlestickSeries, createChart, HistogramData, HistogramSeries, ISeriesApi, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CandleData, ChartProvider, useIndicators, useMainChart, useOverlays } from '../contexts/ChartContext';
import { AuxiliaryChart } from './AuxiliaryChart';
import { ChartLegend } from './ChartLegend';
import { TechnicalSignals } from './TechnicalSignals';

type AnalysisChartProps = {
    data: CandleData[]
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

function AnalysisChartInner() {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const seriesRef = useRef<{
        main?: ISeriesApi<"Candlestick">,
        volume?: ISeriesApi<"Histogram">
    }>({})
    const [chart, setChart] = useState<ReturnType<typeof createChart> | null>(null)
    const [legend, setLegend] = useState<CandleData | null>(null)

    // Get data from context
    const { data, setMainChart, setMainSeries } = useMainChart()
    const { overlays, toggleOverlay } = useOverlays()
    const { addIndicator } = useIndicators()

    // Find default volume overlay
    const volumeOverlay = overlays.find(o => o.id === 'volume-default')
    const showVolume = volumeOverlay?.visible ?? true

    // Create main chart
    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return

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

        // Register with context
        setMainChart(newChart)
        setMainSeries({ candle: mainSeries, volume: volumeSeries })

        return () => {
            newChart.remove()
            setChart(null)
            setMainChart(null)
        }
    }, [data, setMainChart, setMainSeries])

    // Handle crosshair for legend
    useEffect(() => {
        if (!chart) return

        const { main, volume } = seriesRef.current
        if (!main || !volume) return

        const handleCrosshair = (param: any) => {
            if (param.time) {
                const mainData = param.seriesData.get(main) as any

                let volumeVal = undefined
                if (showVolume) {
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
    }, [chart, showVolume])

    // Volume visibility
    useEffect(() => {
        if (!chart) return
        const { main, volume } = seriesRef.current
        if (!main || !volume) return

        if (showVolume) {
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
    }, [chart, showVolume])

    return (
        <div un-flex="~ col gap-4">
            <div un-flex="~">
                <div un-flex="~ items-center gap-2" un-bg="slate-50" un-p="2 r-4" un-border="~ slate-200 rounded-lg">
                    <Settings size={16} un-mr='2' />
                    <ToggleButton active={showVolume} onClick={() => toggleOverlay('volume-default')}>
                        Volume
                    </ToggleButton>
                    <ToggleButton active={false} onClick={() => addIndicator('macd')}>
                        + MACD
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
