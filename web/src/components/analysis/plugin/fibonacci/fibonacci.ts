import type { LineData, Time, WhitespaceData } from 'lightweight-charts';
import { ATR } from 'technicalindicators';
import type { CandleData } from '../../context/ChartContext';
import type { MetaField } from '../meta';
import { getDefaultConfig, type DeriveConfig } from '../meta';

export const FibonacciMeta = [
    { key: 'trendOn', label: 'Show Supertrend', group: 'Trend', type: 'boolean', default: true },
    { key: 'trendFactor', label: 'Supertrend Factor', group: 'Trend', type: 'number', default: 4, min: 0.1, max: 20, step: 0.1 },
    { key: 'trendPeriod', label: 'Supertrend ATR Period', group: 'Trend', type: 'number', default: 25, min: 1, max: 500 },
    { key: 'bullColor', label: 'Bullish Trend Color', group: 'Trend', type: 'color', default: '#26905d' },
    { key: 'bearColor', label: 'Bearish Trend Color', group: 'Trend', type: 'color', default: '#74286d' },
    {
        key: 'historyMode',
        label: 'Historical Ranges',
        group: 'Display',
        type: 'select',
        default: 1,
        options: [
            { value: 0, label: 'None' },
            { value: 1, label: 'Last Trend Only' },
            { value: 2, label: 'All Trends' },
        ] as const,
    },
    { key: 'showTrendline', label: 'Show Diagonal Trendline', group: 'Display', type: 'boolean', default: true },
    { key: 'showMidline', label: 'Show 0.5 Midline', group: 'Display', type: 'boolean', default: true },
    { key: 'lineColor', label: 'Range Line Color', group: 'Style', type: 'color', default: '#0f172a' },
    {
        key: 'lineWidth',
        label: 'Range Line Width',
        group: 'Style',
        type: 'select',
        default: 1,
        options: [
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
        ] as const,
    },
    { key: 'level236', label: 'Level 0.236', group: 'Levels', type: 'number', default: 0.236, min: -2, max: 3, step: 0.001 },
    { key: 'level382', label: 'Level 0.382', group: 'Levels', type: 'number', default: 0.382, min: -2, max: 3, step: 0.001 },
    { key: 'level618', label: 'Level 0.618', group: 'Levels', type: 'number', default: 0.618, min: -2, max: 3, step: 0.001 },
    { key: 'level786', label: 'Level 0.786', group: 'Levels', type: 'number', default: 0.786, min: -2, max: 3, step: 0.001 },
] as const satisfies readonly MetaField[];

export type FibonacciConfig = DeriveConfig<typeof FibonacciMeta>;

export const defaultFibonacciConfig: FibonacciConfig = getDefaultConfig(FibonacciMeta);

export type FibonacciHistoryMode = 0 | 1 | 2;
export type TrendDirection = 1 | -1;

export const fibonacciLevelOrder = [
    'level0',
    'level236',
    'level382',
    'level5',
    'level618',
    'level786',
    'level1',
] as const;

export type FibonacciLevelKey = typeof fibonacciLevelOrder[number];

export type FibonacciLevels = Record<FibonacciLevelKey, number>;

export type FibonacciSegment = {
    trend: TrendDirection;
    startIndex: number;
    endIndex: number;
    low: number;
    lowIndex: number;
    high: number;
    highIndex: number;
    levels: FibonacciLevels;
};

export type FibonacciComputation = {
    supertrend: Array<{
        time: string;
        value: number;
        direction: TrendDirection;
    }>;
    segments: FibonacciSegment[];
};

type RenderPoint = LineData<Time> | WhitespaceData<Time>;

export type FibonacciRenderData = {
    supertrendData: LineData<Time>[];
    levelData: Record<FibonacciLevelKey, RenderPoint[]>;
    trendlineData: RenderPoint[];
};

export function getFibonacciHistoryModeLabel(mode: number): string {
    if (mode === 0) return 'None';
    if (mode === 2) return 'All';
    return 'Last';
}

function normalizeHistoryMode(mode: number): FibonacciHistoryMode {
    if (mode === 0 || mode === 2) return mode;
    return 1;
}

function computeAtr(candleData: CandleData[], period: number): number[] {
    if (candleData.length === 0) return [];
    if (candleData.length === 1) {
        return [Math.max(candleData[0].high - candleData[0].low, 0)];
    }

    // technicalindicators ATR requires enough history and returns only computed points.
    // Clamp period and forward-fill the leading gap so the result aligns to candleData length.
    const p = Math.max(1, Math.min(Math.floor(period), candleData.length - 1));
    const atrValues = ATR.calculate({
        high: candleData.map(c => c.high),
        low: candleData.map(c => c.low),
        close: candleData.map(c => c.close),
        period: p,
    });

    if (atrValues.length === 0) {
        const range = Math.max(candleData[0].high - candleData[0].low, 0);
        return new Array(candleData.length).fill(range);
    }

    const offset = candleData.length - atrValues.length;
    const seed = atrValues[0];
    return candleData.map((_, index) => (index < offset ? seed : atrValues[index - offset]));
}

function computeSupertrend(candleData: CandleData[], factor: number, atrPeriod: number) {
    const atr = computeAtr(candleData, atrPeriod);
    const supertrend = new Array<number>(candleData.length).fill(0);
    const direction = new Array<TrendDirection>(candleData.length).fill(1);

    if (candleData.length === 0) {
        return { supertrend, direction };
    }

    const firstHl2 = (candleData[0].high + candleData[0].low) / 2;
    let finalUpperPrev = firstHl2 + factor * atr[0];
    let finalLowerPrev = firstHl2 - factor * atr[0];
    direction[0] = candleData[0].close <= finalUpperPrev ? 1 : -1;
    supertrend[0] = direction[0] === 1 ? finalUpperPrev : finalLowerPrev;

    for (let i = 1; i < candleData.length; i++) {
        const hl2 = (candleData[i].high + candleData[i].low) / 2;
        const basicUpper = hl2 + factor * atr[i];
        const basicLower = hl2 - factor * atr[i];

        const finalUpper =
            basicUpper < finalUpperPrev || candleData[i - 1].close > finalUpperPrev
                ? basicUpper
                : finalUpperPrev;

        const finalLower =
            basicLower > finalLowerPrev || candleData[i - 1].close < finalLowerPrev
                ? basicLower
                : finalLowerPrev;

        if (direction[i - 1] === 1) {
            direction[i] = candleData[i].close > finalUpper ? -1 : 1;
        } else {
            direction[i] = candleData[i].close < finalLower ? 1 : -1;
        }

        supertrend[i] = direction[i] === 1 ? finalUpper : finalLower;
        finalUpperPrev = finalUpper;
        finalLowerPrev = finalLower;
    }

    return { supertrend, direction };
}

function buildSegment(
    candleData: CandleData[],
    startIndex: number,
    endIndex: number,
    trend: TrendDirection,
    config: FibonacciConfig,
): FibonacciSegment {
    let low = Number.POSITIVE_INFINITY;
    let lowIndex = startIndex;
    let high = Number.NEGATIVE_INFINITY;
    let highIndex = startIndex;

    for (let i = startIndex; i <= endIndex; i++) {
        const candle = candleData[i];
        if (candle.low < low) {
            low = candle.low;
            lowIndex = i;
        }
        if (candle.high > high) {
            high = candle.high;
            highIndex = i;
        }
    }

    const level0 = trend === 1 ? low : high;
    const level1 = trend === 1 ? high : low;
    const distance = level1 - level0;

    const levels: FibonacciLevels = {
        level0,
        level236: level0 + distance * config.level236,
        level382: level0 + distance * config.level382,
        level5: level0 + distance * 0.5,
        level618: level0 + distance * config.level618,
        level786: level0 + distance * config.level786,
        level1,
    };

    return {
        trend,
        startIndex,
        endIndex,
        low,
        lowIndex,
        high,
        highIndex,
        levels,
    };
}

function createEmptyLevelData(): Record<FibonacciLevelKey, RenderPoint[]> {
    return {
        level0: [],
        level236: [],
        level382: [],
        level5: [],
        level618: [],
        level786: [],
        level1: [],
    };
}

function getVisibleSegments(segments: FibonacciSegment[], mode: FibonacciHistoryMode): FibonacciSegment[] {
    if (mode === 0) return [];
    if (mode === 1) {
        return segments.length > 0 ? [segments[segments.length - 1]] : [];
    }
    return segments;
}

export function computeFibonacciData(
    candleData: CandleData[],
    config: FibonacciConfig = defaultFibonacciConfig,
): FibonacciComputation {
    if (candleData.length === 0) {
        return { supertrend: [], segments: [] };
    }

    const trendFactor = Math.max(0.1, config.trendFactor);
    const trendPeriod = Math.max(1, Math.floor(config.trendPeriod));

    const { supertrend, direction } = computeSupertrend(candleData, trendFactor, trendPeriod);

    const segments: FibonacciSegment[] = [];
    let segmentStart = 0;

    for (let i = 1; i <= direction.length; i++) {
        const reachedEnd = i === direction.length;
        const changed = !reachedEnd && direction[i] !== direction[i - 1];

        if (!reachedEnd && !changed) continue;

        const segmentEnd = i - 1;
        const trend = direction[segmentEnd];
        segments.push(buildSegment(candleData, segmentStart, segmentEnd, trend, config));
        segmentStart = i;
    }

    return {
        supertrend: candleData.map((candle, index) => ({
            time: candle.time,
            value: supertrend[index],
            direction: direction[index],
        })),
        segments,
    };
}

export function buildFibonacciRenderData(
    candleData: CandleData[],
    computed: FibonacciComputation,
    config: FibonacciConfig = defaultFibonacciConfig,
): FibonacciRenderData {
    const historyMode = normalizeHistoryMode(config.historyMode);
    const visibleSegments = getVisibleSegments(computed.segments, historyMode);

    const supertrendData: LineData<Time>[] = config.trendOn
        ? computed.supertrend.map(point => ({
            time: point.time as unknown as Time,
            value: point.value,
            color: point.direction === 1 ? config.bearColor : config.bullColor,
        }))
        : [];

    const levelData = createEmptyLevelData();
    for (const key of fibonacciLevelOrder) {
        levelData[key] = candleData.map(candle => ({ time: candle.time as unknown as Time }));
    }

    visibleSegments.forEach(segment => {
        for (const key of fibonacciLevelOrder) {
            if (key === 'level5' && !config.showMidline) continue;
            const level = segment.levels[key];
            for (let i = segment.startIndex; i <= segment.endIndex; i++) {
                levelData[key][i] = {
                    time: candleData[i].time as unknown as Time,
                    value: level,
                };
            }
        }
    });

    const trendlineData: RenderPoint[] = candleData.map(candle => ({ time: candle.time as unknown as Time }));
    if (config.showTrendline) {
        visibleSegments.forEach(segment => {
            if (segment.lowIndex === segment.highIndex) return;

            const startIndex = Math.min(segment.lowIndex, segment.highIndex);
            const endIndex = Math.max(segment.lowIndex, segment.highIndex);
            const startValue = startIndex === segment.lowIndex ? segment.low : segment.high;
            const endValue = endIndex === segment.lowIndex ? segment.low : segment.high;
            const span = endIndex - startIndex;

            for (let i = startIndex; i <= endIndex; i++) {
                const t = span === 0 ? 0 : (i - startIndex) / span;
                const value = startValue + (endValue - startValue) * t;
                trendlineData[i] = {
                    time: candleData[i].time as unknown as Time,
                    value,
                };
            }
        });
    }

    return { supertrendData, levelData, trendlineData };
}
