import { EMA, RSI, SMA } from 'technicalindicators';
import type { CandleData } from '../../context/ChartContext';
import type { MetaField } from '../meta';
import { getDefaultConfig, type DeriveConfig } from '../meta';

export const RSISource = {
    Close: 0,
    Open: 1,
    High: 2,
    Low: 3,
    HL2: 4,
    HLC3: 5,
    OHLC4: 6,
} as const;

export const RSISmoothing = {
    None: 0,
    SMA: 1,
    SMABB: 2,
    EMA: 3,
    RMA: 4,
    WMA: 5,
    VWMA: 6,
} as const;

export const RSIMeta = [
    // Inputs
    { key: 'period', label: 'RSI Length', group: 'Inputs', type: 'number', default: 14, min: 1, max: 500 },
    {
        key: 'source',
        label: 'Source',
        group: 'Inputs',
        type: 'select',
        default: RSISource.Close,
        options: [
            { value: RSISource.Close, label: 'Close' },
            { value: RSISource.Open, label: 'Open' },
            { value: RSISource.High, label: 'High' },
            { value: RSISource.Low, label: 'Low' },
            { value: RSISource.HL2, label: 'HL2' },
            { value: RSISource.HLC3, label: 'HLC3' },
            { value: RSISource.OHLC4, label: 'OHLC4' },
        ] as const,
    },
    // Levels
    { key: 'overbought', label: 'Overbought', group: 'Levels', type: 'number', default: 70, min: 1, max: 100 },
    { key: 'middle', label: 'Middle', group: 'Levels', type: 'number', default: 50, min: 1, max: 100 },
    { key: 'oversold', label: 'Oversold', group: 'Levels', type: 'number', default: 30, min: 1, max: 100 },
    { key: 'showMiddleLine', label: 'Show Middle', group: 'Levels', type: 'boolean', default: true },
    // Style
    { key: 'rsiColor', label: 'RSI Line', group: 'Style', type: 'color', default: '#7E57C2' },
    {
        key: 'rsiLineWidth',
        label: 'RSI Width',
        group: 'Style',
        type: 'select',
        default: 1,
        options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }] as const,
    },
    { key: 'overboughtColor', label: 'Overbought Color', group: 'Style', type: 'color', default: '#787B86' },
    { key: 'middleColor', label: 'Middle Color', group: 'Style', type: 'color', default: '#B2B5BE' },
    { key: 'oversoldColor', label: 'Oversold Color', group: 'Style', type: 'color', default: '#787B86' },
    {
        key: 'levelLineWidth',
        label: 'Level Width',
        group: 'Style',
        type: 'select',
        default: 1,
        options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }] as const,
    },
    // Smoothing
    {
        key: 'smoothingType',
        label: 'Type',
        group: 'Smoothing',
        type: 'select',
        default: RSISmoothing.SMA,
        options: [
            { value: RSISmoothing.None, label: 'None' },
            { value: RSISmoothing.SMA, label: 'SMA' },
            { value: RSISmoothing.SMABB, label: 'SMA + BB' },
            { value: RSISmoothing.EMA, label: 'EMA' },
            { value: RSISmoothing.RMA, label: 'SMMA (RMA)' },
            { value: RSISmoothing.WMA, label: 'WMA' },
            { value: RSISmoothing.VWMA, label: 'VWMA' },
        ] as const,
    },
    { key: 'smoothingLength', label: 'Length', group: 'Smoothing', type: 'number', default: 14, min: 1, max: 200 },
    { key: 'bbStdDev', label: 'BB StdDev', group: 'Smoothing', type: 'number', default: 2, min: 1, max: 10 },
    { key: 'smoothingColor', label: 'Smoothing Color', group: 'Smoothing', type: 'color', default: '#FF6D00' },
    { key: 'bbColor', label: 'BB Color', group: 'Smoothing', type: 'color', default: '#94A3B8' },
] as const satisfies readonly MetaField[];

export type RSIConfig = DeriveConfig<typeof RSIMeta>;

export const defaultRSIConfig: RSIConfig = getDefaultConfig(RSIMeta);

export type RSIData = {
    time: string;
    value?: number;
    ma?: number;
    bbUpper?: number;
    bbLower?: number;
};

export function getRSISourceLabel(source: number): string {
    switch (source) {
        case RSISource.Close: return 'close';
        case RSISource.Open: return 'open';
        case RSISource.High: return 'high';
        case RSISource.Low: return 'low';
        case RSISource.HL2: return 'hl2';
        case RSISource.HLC3: return 'hlc3';
        case RSISource.OHLC4: return 'ohlc4';
        default: return 'close';
    }
}

function getSourceValue(candle: CandleData, source: number): number {
    switch (source) {
        case RSISource.Open:
            return candle.open;
        case RSISource.High:
            return candle.high;
        case RSISource.Low:
            return candle.low;
        case RSISource.HL2:
            return (candle.high + candle.low) / 2;
        case RSISource.HLC3:
            return (candle.high + candle.low + candle.close) / 3;
        case RSISource.OHLC4:
            return (candle.open + candle.high + candle.low + candle.close) / 4;
        case RSISource.Close:
        default:
            return candle.close;
    }
}

function calcRMA(values: number[], length: number): number[] {
    if (length <= 0 || values.length < length) return [];

    const seed = values.slice(0, length).reduce((sum, v) => sum + v, 0) / length;
    const result: number[] = [seed];
    let prev = seed;

    for (let i = length; i < values.length; i++) {
        prev = ((prev * (length - 1)) + values[i]) / length;
        result.push(prev);
    }

    return result;
}

function calcWMA(values: number[], length: number): number[] {
    if (length <= 0 || values.length < length) return [];

    const divisor = (length * (length + 1)) / 2;
    const result: number[] = [];

    for (let i = length - 1; i < values.length; i++) {
        let weightedSum = 0;
        for (let j = 0; j < length; j++) {
            weightedSum += values[i - length + 1 + j] * (j + 1);
        }
        result.push(weightedSum / divisor);
    }

    return result;
}

function calcVWMA(values: number[], volumes: number[], length: number): number[] {
    if (length <= 0 || values.length < length) return [];

    const result: number[] = [];

    for (let i = length - 1; i < values.length; i++) {
        let weightedSum = 0;
        let volumeSum = 0;

        for (let j = 0; j < length; j++) {
            const idx = i - length + 1 + j;
            weightedSum += values[idx] * volumes[idx];
            volumeSum += volumes[idx];
        }

        result.push(volumeSum === 0 ? values[i] : weightedSum / volumeSum);
    }

    return result;
}

function calcSmoothing(values: number[], volumes: number[], type: number, length: number): number[] {
    switch (type) {
        case RSISmoothing.SMA:
        case RSISmoothing.SMABB:
            return SMA.calculate({ period: length, values });
        case RSISmoothing.EMA:
            return EMA.calculate({ period: length, values });
        case RSISmoothing.RMA:
            return calcRMA(values, length);
        case RSISmoothing.WMA:
            return calcWMA(values, length);
        case RSISmoothing.VWMA:
            return calcVWMA(values, volumes, length);
        case RSISmoothing.None:
        default:
            return [];
    }
}

function calcBollinger(values: number[], length: number, stdDevMult: number) {
    if (length <= 0 || values.length < length) return [];

    const result: { upper: number; lower: number; }[] = [];

    for (let i = length - 1; i < values.length; i++) {
        const window = values.slice(i - length + 1, i + 1);
        const mean = window.reduce((sum, v) => sum + v, 0) / length;
        const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / length;
        const stdDev = Math.sqrt(variance);

        result.push({
            upper: mean + stdDev * stdDevMult,
            lower: mean - stdDev * stdDevMult,
        });
    }

    return result;
}

export function calcRSI(data: CandleData[], config: RSIConfig = defaultRSIConfig): RSIData[] {
    if (data.length === 0) return [];

    const sourceValues = data.map(d => getSourceValue(d, config.source));
    const rsiValues = RSI.calculate({
        period: config.period,
        values: sourceValues,
    });

    const offset = data.length - rsiValues.length;
    const result: RSIData[] = data.map((d, i) => ({
        time: d.time,
        value: rsiValues[i - offset],
    }));

    if (config.smoothingType === RSISmoothing.None) return result;

    const validPoints = result
        .map((d, index) => (
            d.value === undefined
                ? null
                : { index, value: d.value, volume: data[index].volume }
        ))
        .filter((p): p is { index: number; value: number; volume: number; } => p !== null);

    if (validPoints.length === 0) return result;

    const values = validPoints.map(p => p.value);
    const volumes = validPoints.map(p => p.volume);
    const smoothingLength = Math.max(1, config.smoothingLength);

    const maValues = calcSmoothing(values, volumes, config.smoothingType, smoothingLength);
    const maOffset = values.length - maValues.length;

    for (let i = 0; i < maValues.length; i++) {
        const outputIndex = validPoints[i + maOffset].index;
        result[outputIndex].ma = maValues[i];
    }

    if (config.smoothingType === RSISmoothing.SMABB) {
        const bb = calcBollinger(values, smoothingLength, config.bbStdDev);
        const bbOffset = values.length - bb.length;

        for (let i = 0; i < bb.length; i++) {
            const outputIndex = validPoints[i + bbOffset].index;
            result[outputIndex].bbUpper = bb[i].upper;
            result[outputIndex].bbLower = bb[i].lower;
        }
    }

    return result;
}
