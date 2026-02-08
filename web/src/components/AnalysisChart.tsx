import { CandlestickSeries, createChart, HistogramData, HistogramSeries, Time } from 'lightweight-charts';
import { Settings } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CandleData, ChartProvider, useIndicators, useMainChart, useOverlays } from '../contexts/ChartContext';
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
    const { overlays, addOverlay, setOverlayLegend } = useOverlays()
    const { addIndicator } = useIndicators()

    // Check if any volume overlay is visible (for chart margin calculations)
    const showVolume = overlays.some(o => o.type === 'volume' && o.visible)

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

        // Register with context
        setMainChart(newChart)
        setMainSeries({ candle: mainSeries, volume: volumeSeries })

        return () => {
            newChart.remove()
            setMainChart(null)
        }
    }, [data, setMainChart, setMainSeries])

    // Handle crosshair for legend
    useEffect(() => {
        if (!chart) return

        const { candle: main, volume } = series
        if (!main || !volume) return

        // Find the volume overlay to update its legend
        const volumeOverlay = overlays.find(o => o.type === 'volume')

        const handleCrosshair = (param: any) => {
            const isHovering = param.point !== undefined && param.time !== undefined &&
                param.point.x >= 0 && param.point.x < chartContainerRef.current!.clientWidth &&
                param.point.y >= 0 && param.point.y < chartContainerRef.current!.clientHeight

            if (param.time && isHovering) {
                const mainData = param.seriesData.get(main) as any
                if (mainData) {
                    setMainLegend({
                        open: mainData.open,
                        high: mainData.high,
                        low: mainData.low,
                        close: mainData.close,
                    })
                }

                // Update volume overlay legend
                if (volumeOverlay) {
                    const vData = param.seriesData.get(volume) as HistogramData<Time> | undefined
                    if (vData?.value !== undefined) {
                        setOverlayLegend(volumeOverlay.id, { volume: vData.value })
                    }
                }
            } else {
                setMainLegend(null)
                if (volumeOverlay) {
                    setOverlayLegend(volumeOverlay.id, undefined)
                }
            }
        }

        chart.subscribeCrosshairMove(handleCrosshair)
        return () => chart.unsubscribeCrosshairMove(handleCrosshair)
    }, [chart, showVolume, overlays, setMainLegend, setOverlayLegend])

    // Volume visibility
    useEffect(() => {
        if (!chart) return
        const { candle: main, volume } = series
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
                    <AddButton onClick={() => addOverlay('volume')}>
                        + Volume
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
