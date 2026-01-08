import { createServerFn } from '@tanstack/react-start'

export type OHLCData = {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
}

type YahooChartResult = {
    meta: {
        symbol: string
        regularMarketPrice: number
    }
    timestamp: number[]
    indicators: {
        quote: {
            open: number[]
            high: number[]
            low: number[]
            close: number[]
            volume: number[]
        }[]
    }
}

type YahooChartResponse = {
    chart: {
        result: YahooChartResult[] | null
        error: { code: string; description: string } | null
    }
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

const symbolMap: Record<string, string> = {
    'SPX': '^SPX',
    'NDX': '^NDX',
    'DJI': '^DJI',
    'VIX': '^VIX',
    'SP500': '^SPX',
}

/**
 * Server function to fetch historical OHLC data from Yahoo Finance.
 * Uses createServerFn for proper TanStack Start server-side execution.
 */
export const getHistoricalData = createServerFn({ method: 'GET' })
    .inputValidator((data: string) => data)
    .handler(async ({ data: symbol }) => {
        const upperSymbol = symbol.toUpperCase()
        const yahooSymbol = symbolMap[upperSymbol] ?? (upperSymbol.startsWith('^') ? upperSymbol : symbol)

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5y&interval=1d`

        const response = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT }
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`Failed to fetch historical data (${response.status}): ${text.slice(0, 100)}`)
        }

        const data: YahooChartResponse = await response.json()

        if (data.chart.error) {
            throw new Error(`Yahoo API error: ${data.chart.error.description}`)
        }

        const result = data.chart.result?.[0]
        if (!result || !result.timestamp) {
            throw new Error(`No historical data found for ${symbol}`)
        }

        const { timestamp, indicators } = result
        const quote = indicators.quote[0]

        const ohlcData: OHLCData[] = []

        for (let i = 0; i < timestamp.length; i++) {
            // Skip days with missing data
            if (quote.open[i] == null || quote.close[i] == null) continue

            ohlcData.push({
                date: new Date(timestamp[i] * 1000).toISOString().split('T')[0],
                open: quote.open[i],
                high: quote.high[i],
                low: quote.low[i],
                close: quote.close[i],
                volume: quote.volume[i] ?? 0,
            })
        }

        return ohlcData
    })
