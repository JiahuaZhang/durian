import { createChart, ISeriesApi, LineSeries } from 'lightweight-charts';
import { Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartConfigPopup } from '../../ChartConfigPopup';
import { useCandleData, useChart, useIndicators } from '../../context/ChartContext';
import { buildMetaTabs } from '../meta';
import { calcRSI, getRSISourceLabel, RSIMeta, RSISmoothing, type RSIConfig, type RSIData } from './rsi';

type RSIChartProps = {
    id: string;
};

type RSILegend = {
    time: string;
    rsi?: number;
    ma?: number;
    bbUpper?: number;
    bbLower?: number;
};

const formatValue = (value: number | undefined) => value === undefined ? '--' : value.toFixed(2);

export function RSIChart({ id }: RSIChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const seriesRef = useRef<{
        rsi?: ISeriesApi<'Line'>;
        upper?: ISeriesApi<'Line'>;
        middle?: ISeriesApi<'Line'>;
        lower?: ISeriesApi<'Line'>;
        ma?: ISeriesApi<'Line'>;
        bbUpper?: ISeriesApi<'Line'>;
        bbLower?: ISeriesApi<'Line'>;
    }>({});
    const [chart, setChart] = useState<ReturnType<typeof createChart> | null>(null);
    const [legend, setLegend] = useState<RSILegend | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const cogRef = useRef<HTMLButtonElement>(null);

    const { chartRef: mainChartRef, candleSeriesRef, syncingRef } = useChart();
    const candleData = useCandleData();
    const { getIndicator, updateIndicator, removeIndicator, updateIndicatorConfig } = useIndicators();

    const indicator = getIndicator(id);
    const rsiConfig = indicator?.config as RSIConfig | undefined;

    const rsiData = useMemo<RSIData[]>(() => {
        if (!rsiConfig || candleData.length === 0) return [];
        return calcRSI(candleData, rsiConfig);
    }, [candleData, rsiConfig]);

    const configTabs = useMemo(() => {
        if (!rsiConfig) return [];
        return buildMetaTabs(RSIMeta, rsiConfig, (updates) => updateIndicatorConfig(id, updates));
    }, [id, rsiConfig, updateIndicatorConfig]);

    useEffect(() => {
        updateIndicator(id, { data: { rsiData } });
    }, [id, rsiData, updateIndicator]);

    useEffect(() => {
        if (!containerRef.current || candleData.length === 0 || !rsiConfig) return;

        const newChart = createChart(containerRef.current);

        const levelLineWidth = rsiConfig.levelLineWidth as 1 | 2 | 3 | 4;

        const upperSeries = newChart.addSeries(LineSeries, {
            color: rsiConfig.overboughtColor,
            lineWidth: levelLineWidth,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        upperSeries.setData(candleData.map(d => ({ time: d.time, value: rsiConfig.overbought })) as any);

        const middleSeries = newChart.addSeries(LineSeries, {
            color: rsiConfig.middleColor,
            lineWidth: levelLineWidth,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            visible: rsiConfig.showMiddleLine,
        });
        middleSeries.setData(candleData.map(d => ({ time: d.time, value: rsiConfig.middle })) as any);

        const lowerSeries = newChart.addSeries(LineSeries, {
            color: rsiConfig.oversoldColor,
            lineWidth: levelLineWidth,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        lowerSeries.setData(candleData.map(d => ({ time: d.time, value: rsiConfig.oversold })) as any);

        const rsiSeries = newChart.addSeries(LineSeries, {
            color: rsiConfig.rsiColor,
            lineWidth: rsiConfig.rsiLineWidth as 1 | 2 | 3 | 4,
            priceLineVisible: false,
            lastValueVisible: false,
        });
        rsiSeries.setData(rsiData.filter(d => d.value !== undefined).map(d => ({ time: d.time, value: d.value })) as any);

        let maSeries: ISeriesApi<'Line'> | undefined;
        let bbUpperSeries: ISeriesApi<'Line'> | undefined;
        let bbLowerSeries: ISeriesApi<'Line'> | undefined;

        if (rsiConfig.smoothingType !== RSISmoothing.None) {
            maSeries = newChart.addSeries(LineSeries, {
                color: rsiConfig.smoothingColor,
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
            });
            maSeries.setData(rsiData.filter(d => d.ma !== undefined).map(d => ({ time: d.time, value: d.ma })) as any);
        }

        if (rsiConfig.smoothingType === RSISmoothing.SMABB) {
            bbUpperSeries = newChart.addSeries(LineSeries, {
                color: rsiConfig.bbColor,
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });
            bbUpperSeries.setData(rsiData.filter(d => d.bbUpper !== undefined).map(d => ({ time: d.time, value: d.bbUpper })) as any);

            bbLowerSeries = newChart.addSeries(LineSeries, {
                color: rsiConfig.bbColor,
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });
            bbLowerSeries.setData(rsiData.filter(d => d.bbLower !== undefined).map(d => ({ time: d.time, value: d.bbLower })) as any);
        }

        seriesRef.current = {
            rsi: rsiSeries,
            upper: upperSeries,
            middle: middleSeries,
            lower: lowerSeries,
            ma: maSeries,
            bbUpper: bbUpperSeries,
            bbLower: bbLowerSeries,
        };
        setChart(newChart);

        updateIndicator(id, { chart: newChart, series: seriesRef.current });

        return () => {
            newChart.remove();
            setChart(null);
        };
    }, [id, candleData, rsiData, rsiConfig, updateIndicator]);

    useEffect(() => {
        const mainChart = mainChartRef.current;
        if (!chart || !mainChart) return;

        const handleMainRangeChange = (range: any) => {
            if (syncingRef.current || !range) return;
            syncingRef.current = true;
            chart.timeScale().setVisibleLogicalRange(range);
            syncingRef.current = false;
        };

        const handleAuxRangeChange = (range: any) => {
            if (syncingRef.current || !range) return;
            syncingRef.current = true;
            mainChart.timeScale().setVisibleLogicalRange(range);
            syncingRef.current = false;
        };

        mainChart.timeScale().subscribeVisibleLogicalRangeChange(handleMainRangeChange);
        chart.timeScale().subscribeVisibleLogicalRangeChange(handleAuxRangeChange);

        return () => {
            mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handleMainRangeChange);
            chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleAuxRangeChange);
        };
    }, [chart, mainChartRef, syncingRef]);

    useEffect(() => {
        const mainChart = mainChartRef.current;
        const candleSeries = candleSeriesRef.current;
        const rsiSeries = seriesRef.current.rsi;
        if (!chart || !mainChart || !candleSeries || !rsiSeries) return;

        const mainToAux = (param: any) => {
            if (param.time) {
                chart.setCrosshairPosition(0, param.time, rsiSeries);
            } else {
                chart.clearCrosshairPosition();
            }
        };

        const auxToMain = (param: any) => {
            if (param.time) {
                mainChart.setCrosshairPosition(0, param.time, candleSeries);
            } else {
                mainChart.clearCrosshairPosition();
            }
        };

        mainChart.subscribeCrosshairMove(mainToAux);
        chart.subscribeCrosshairMove(auxToMain);

        return () => {
            mainChart.unsubscribeCrosshairMove(mainToAux);
            chart.unsubscribeCrosshairMove(auxToMain);
        };
    }, [chart, mainChartRef, candleSeriesRef]);

    useEffect(() => {
        if (!chart) return;

        const handleCrosshair = (param: any) => {
            if (param.time) {
                const rsi = seriesRef.current.rsi ? (param.seriesData.get(seriesRef.current.rsi) as any)?.value : undefined;
                const ma = seriesRef.current.ma ? (param.seriesData.get(seriesRef.current.ma) as any)?.value : undefined;
                const bbUpper = seriesRef.current.bbUpper ? (param.seriesData.get(seriesRef.current.bbUpper) as any)?.value : undefined;
                const bbLower = seriesRef.current.bbLower ? (param.seriesData.get(seriesRef.current.bbLower) as any)?.value : undefined;

                setLegend({
                    time: param.time,
                    rsi,
                    ma,
                    bbUpper,
                    bbLower,
                });
            } else {
                setLegend(null);
            }
        };

        chart.subscribeCrosshairMove(handleCrosshair);
        return () => chart.unsubscribeCrosshairMove(handleCrosshair);
    }, [chart]);

    if (!indicator || !rsiConfig) return null;

    return (
        <div
            un-w="6xl"
            un-h="60"
            un-border="~ slate-200"
            un-shadow="sm"
            un-position="relative"
        >
            <div un-position="absolute top-2 left-2 z-10" un-text="xs" un-flex="~ items-center gap-2">
                <button
                    ref={cogRef}
                    onClick={() => setConfigOpen(p => !p)}
                    un-p="1"
                    un-cursor="pointer"
                    un-text="slate-400 hover:slate-600"
                    un-bg="transparent hover:slate-100"
                    un-border="rounded"
                >
                    <Settings size={14} />
                </button>

                <span>
                    RSI {rsiConfig.period} {getRSISourceLabel(rsiConfig.source)}
                </span>
                <span un-text="violet-600">{formatValue(legend?.rsi)}</span>
                {rsiConfig.smoothingType !== RSISmoothing.None && (
                    <span un-text="orange-600">{formatValue(legend?.ma)}</span>
                )}
                {rsiConfig.smoothingType === RSISmoothing.SMABB && (
                    <>
                        <span un-text="slate-500">{formatValue(legend?.bbUpper)}</span>
                        <span un-text="slate-500">{formatValue(legend?.bbLower)}</span>
                    </>
                )}

                <ChartConfigPopup
                    title="RSI Settings"
                    isOpen={configOpen}
                    onClose={() => setConfigOpen(false)}
                    triggerRef={cogRef}
                    tabs={configTabs}
                />
            </div>

            <button
                onClick={() => removeIndicator(id)}
                un-position="absolute top-2 right-2 z-10"
                un-p="1"
                un-cursor="pointer"
                un-text="slate-400 hover:red-600"
                un-bg="transparent hover:slate-100"
                un-border="rounded"
            >
                <X size={14} />
            </button>

            <div ref={containerRef} un-h="full" />
        </div>
    );
}
