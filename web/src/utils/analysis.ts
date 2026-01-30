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

export function calcMACD(data: CandleData[]): MACDData[] {
    const result = MACD.calculate({
        values: data.map(d => d.close),
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
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
