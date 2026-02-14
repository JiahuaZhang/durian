import { createChart, ISeriesApi, LineSeries, Time } from 'lightweight-charts';
import { EMA, SMA } from 'technicalindicators';
import type { CandleData, OverlayIndicator } from '../../context/ChartContext';

// Re-export MA config types for convenience
export type { EMAConfig, SMAConfig } from '../../context/ChartContext';

import type { EMAConfig, SMAConfig } from '../../context/ChartContext';
import { findMACrosses } from './MovingAverageSignal';

// ── Default config ───────────────────────────────────────────────────────

export function getDefaultMAConfig(type: 'sma' | 'ema'): SMAConfig | EMAConfig {
    return {
        period: 20,
        color: type === 'sma' ? '#2962FF' : '#FF6D00',
        lineWidth: 1,
        showCrossSignals: false,
        bullishColor: '#26A69A',
        bearishColor: '#EF5350',
        bullishTextColor: '#1B5E20',
        bearishTextColor: '#B71C1C',
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
                textColor: isBull ? config.bullishTextColor : config.bearishTextColor,
            });
        });
    });

    allMarkers.sort((a, b) => a.time.localeCompare(b.time));
    return allMarkers;
}
