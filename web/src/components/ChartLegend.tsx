import { type CandleData } from "./AnalysisChart";

type ChartLegendProps = {
    legend: CandleData | null;
}

const formatPrice = (val: number) => val.toFixed(2)
const formatVol = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B'
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M'
    if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K'
    return val.toString()
}
const getColor = (d: CandleData) => d.close >= d.open ? '#26a69a' : '#ef5350'
export const UnoTrick = <div un-text="#26a69a #ef5350" />

export function ChartLegend({ legend }: ChartLegendProps) {
    if (!legend) return null;

    const color = getColor(legend)

    return (
        <div un-position="absolute top-2 left-2" un-z="10" un-text="xs" un-font="mono" un-max-w='md' un-bg='white' un-shadow='sm' un-border='rounded' un-p='1' >
            <div un-flex="~ wrap gap-2">
                <div un-flex="~ gap-1">
                    <span un-text="slate-500">O</span>
                    <span un-text={color}>{formatPrice(legend.open)}</span>
                </div>
                <div un-flex="~ gap-1">
                    <span un-text="slate-500">H</span>
                    <span un-text={color}>{formatPrice(legend.high)}</span>
                </div>
                <div un-flex="~ gap-1">
                    <span un-text="slate-500">L</span>
                    <span un-text={color}>{formatPrice(legend.low)}</span>
                </div>
                <div un-flex="~ gap-1">
                    <span un-text="slate-500">C</span>
                    <span un-text={color}>{formatPrice(legend.close)}</span>
                </div>
            </div>
            <div un-flex="~ wrap gap-2">
                <div un-flex="~ gap-1">
                    <span un-text="slate-500">V</span>
                    <span un-text={color}>{formatVol(legend.volume)}</span>
                </div>
                <div un-flex="~ gap-1">
                    <span un-text={legend.close >= legend.open ? 'green-500' : 'red-500'}>
                        {legend.close >= legend.open ? '↑' : '↓'} {(legend.close - legend.open).toFixed(2)} ({((legend.close - legend.open) / legend.open * 100).toFixed(2)}%)
                    </span>
                </div>
            </div>
        </div>
    )
}
