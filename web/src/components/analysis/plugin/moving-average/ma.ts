import { createChart, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { EMA, SMA } from 'technicalindicators';
import type { CandleData, EMAConfig, OverlayIndicator } from '../../context/ChartContext';
import { findMACrosses } from './MovingAverageSignal';

export type SMAConfig = {
    period: number;
    color: string;
    lineWidth: number;
    showCrossSignals: boolean;
    bullishColor: string;
    bearishColor: string
};

// ── Default config ───────────────────────────────────────────────────────

export function getDefaultMAConfig(type: 'sma' | 'ema'): SMAConfig | EMAConfig {
    return {
        period: 200,
        color: type === 'sma' ? '#2962FF' : '#FF6D00',
        lineWidth: 1,
        showCrossSignals: true,
        bullishColor: '#2b7fff',
        bearishColor: '#e7000b'
    };
}

// ── Data computation ─────────────────────────────────────────────────────

export function computeMAData(candleData: CandleData[], type: 'sma' | 'ema', config: SMAConfig | EMAConfig) {
    const closePrices = candleData.map(d => d.close);
    const calculatedValues = type === 'sma'
        ? SMA.calculate({ period: config.period, values: closePrices })
        : EMA.calculate({ period: config.period, values: closePrices });

    if (!calculatedValues.length) return [];

    return candleData.slice(config.period - 1).map((d, i) => ({
        time: d.time as unknown as Time,
        value: calculatedValues[i],
    }));
}

// ── Series creation ──────────────────────────────────────────────────────

export function createMASeries(
    chart: ReturnType<typeof createChart>,
    config: SMAConfig | EMAConfig,
): ISeriesApi<'Line'> {
    return chart.addSeries(LineSeries, {
        color: config.color,
        lineWidth: config.lineWidth as 1 | 2 | 3 | 4,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
    });
}

// ── Cross signal markers ─────────────────────────────────────────────────

export type MAMarker = {
    time: string;
    position: 'belowBar' | 'aboveBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown';
    text: string;
    textColor?: string;
};

export function buildMACrossMarkers(overlays: OverlayIndicator[], data: CandleData[]): MAMarker[] {
    const allMarkers: MAMarker[] = [];

    overlays.forEach(overlay => {
        const crosses = findMACrosses(data, overlay.data);
        const config = overlay.config as SMAConfig | EMAConfig;
        const label = overlay.type === 'sma' ? `SMA${config.period}` : `EMA${config.period}`;

        crosses.forEach(cross => {
            const isBull = cross.type === 'bullish';
            allMarkers.push({
                time: cross.date,
                position: isBull ? 'belowBar' : 'aboveBar',
                color: isBull ? config.bullishColor : config.bearishColor,
                shape: isBull ? 'arrowUp' : 'arrowDown',
                text: `${isBull ? 'Bull' : 'Bear'} ${label}`,
            });
        });
    });

    allMarkers.sort((a, b) => a.time.localeCompare(b.time));
    return allMarkers;
}
