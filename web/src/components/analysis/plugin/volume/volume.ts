import { createChart, HistogramSeries } from 'lightweight-charts';
import type { CandleData } from '../../context/ChartContext';

// Re-export for convenience
export type { VolumeConfig } from '../../context/ChartContext';

import type { VolumeConfig } from '../../context/ChartContext';

// ── Default config ───────────────────────────────────────────────────────

export const defaultVolumeConfig: VolumeConfig = {
    upColor: '#26a69a',
    downColor: '#ef5350',
};

// ── Data computation ─────────────────────────────────────────────────────

export function computeVolumeData(candleData: CandleData[], config: VolumeConfig) {
    return candleData.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? config.upColor : config.downColor,
    }));
}

// ── Series creation ──────────────────────────────────────────────────────

export function createVolumeSeries(chart: ReturnType<typeof createChart>) {
    return chart.addSeries(HistogramSeries, {
        priceScaleId: '',
        lastValueVisible: false,
        priceLineVisible: false,
    });
}
