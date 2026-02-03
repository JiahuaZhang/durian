import { CandleData } from '@/components/AnalysisChart'
import { MACD } from 'technicalindicators'

export type MACDData = {
    time: string
    macd?: number
    signal?: number
    histogram?: number
}

export type MACDCross = {
    date: string
    type: 'golden' | 'dead'
    macdValue: number
    daysSinceLastCross?: number
}

export type Pivot = {
    index: number
    date: string
    price: number
    macd: number
    type: 'high' | 'low'
}

export type MACDDivergence = {
    type: 'bullish' | 'bearish'
    startDate: string
    endDate: string
    startPrice: number
    endPrice: number
    startMacd: number
    endMacd: number
}

export function calcMACD(
    data: CandleData[],
    config: { fast: number; slow: number; signal: number } = { fast: 12, slow: 26, signal: 9 }
): MACDData[] {
    const result = MACD.calculate({
        values: data.map(d => d.close),
        fastPeriod: config.fast,
        slowPeriod: config.slow,
        signalPeriod: config.signal,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    })

    const offset = data.length - result.length
    return data.map((d, i) => ({
        time: d.time,
        macd: result[i - offset]?.MACD,
        signal: result[i - offset]?.signal,
        histogram: result[i - offset]?.histogram,
    }))
}

export function findMACDCrosses(macdData: MACDData[]): MACDCross[] {
    const crosses: MACDCross[] = []

    for (let i = 1; i < macdData.length; i++) {
        const prev = macdData[i - 1]
        const curr = macdData[i]

        if (prev.macd === undefined || prev.signal === undefined ||
            curr.macd === undefined || curr.signal === undefined) continue

        const prevDiff = prev.macd - prev.signal
        const currDiff = curr.macd - curr.signal

        if (prevDiff <= 0 && currDiff > 0) {
            crosses.push({ date: curr.time, type: 'golden', macdValue: curr.macd })
        } else if (prevDiff >= 0 && currDiff < 0) {
            crosses.push({ date: curr.time, type: 'dead', macdValue: curr.macd })
        }
    }

    for (let i = 1; i < crosses.length; i++) {
        const prev = new Date(crosses[i - 1].date)
        const curr = new Date(crosses[i].date)
        crosses[i].daysSinceLastCross = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    }

    return crosses.reverse()
}

function findPivots(data: CandleData[], macdData: MACDData[], window = 20): Pivot[] {
    const pivots: Pivot[] = []

    for (let i = window; i < data.length - window; i++) {
        const macd = macdData[i].macd
        if (macd === undefined) continue

        const lowPrice = data[i].low
        const highPrice = data[i].high

        let isLow = true
        let isHigh = true

        for (let j = 1; j <= window; j++) {
            if (data[i - j].low <= lowPrice || data[i + j].low <= lowPrice) isLow = false
            if (data[i - j].high >= highPrice || data[i + j].high >= highPrice) isHigh = false
        }

        if (isLow) {
            pivots.push({ index: i, date: data[i].time, price: lowPrice, macd, type: 'low' })
        }
        if (isHigh) {
            pivots.push({ index: i, date: data[i].time, price: highPrice, macd, type: 'high' })
        }
    }

    return pivots
}

export function findMACDDivergences(data: CandleData[], macdData: MACDData[], window = 20): MACDDivergence[] {
    const pivots = findPivots(data, macdData, window)
    const divergences: MACDDivergence[] = []

    const lows = pivots.filter(p => p.type === 'low')
    const highs = pivots.filter(p => p.type === 'high')

    // Bullish divergence: price lower low, MACD higher low
    for (let i = 1; i < lows.length; i++) {
        const prev = lows[i - 1]
        const curr = lows[i]

        if (curr.price < prev.price && curr.macd > prev.macd) {
            divergences.push({
                type: 'bullish',
                startDate: prev.date,
                endDate: curr.date,
                startPrice: prev.price,
                endPrice: curr.price,
                startMacd: prev.macd,
                endMacd: curr.macd,
            })
        }
    }

    // Bearish divergence: price higher high, MACD lower high
    for (let i = 1; i < highs.length; i++) {
        const prev = highs[i - 1]
        const curr = highs[i]

        if (curr.price > prev.price && curr.macd < prev.macd) {
            divergences.push({
                type: 'bearish',
                startDate: prev.date,
                endDate: curr.date,
                startPrice: prev.price,
                endPrice: curr.price,
                startMacd: prev.macd,
                endMacd: curr.macd,
            })
        }
    }

    return divergences.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
}
