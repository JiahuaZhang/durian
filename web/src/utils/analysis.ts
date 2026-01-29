import { CandleData } from '@/components/AnalysisChart'
import { MACD } from 'technicalindicators'

export type MACDData = {
    time: string
    macd?: number
    signal?: number
    histogram?: number
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
