import { useEffect, useRef, useState } from 'react'

export type Trade = {
    p: string // Price
    q: string // Quantity
    T: number // Trade time
    m: boolean // Is buyer maker? (true = Sell, false = Buy)
}

export type VolumeAtPrice = {
    buy: number
    sell: number
}

export type FootprintCandle = {
    timestamp: number // Start of the candle (e.g. minute start)
    open: number
    close: number
    high: number
    low: number
    volumeAtPrice: Record<string, VolumeAtPrice> // price -> volume
}

interface FootprintChartProps {
    latestTrade: Trade | null
}

const CANDLE_DURATION = 60 * 1000 // 1 minute

export function FootprintChart({ latestTrade }: FootprintChartProps) {
    const [candles, setCandles] = useState<FootprintCandle[]>([])
    // We use a ref to keep track of the current candles state without depending on it in useEffect
    // This prevents the effect from running on every render if we were to just use state
    const candlesRef = useRef<FootprintCandle[]>([])

    useEffect(() => {
        if (!latestTrade) return

        const price = parseFloat(latestTrade.p)
        const qty = parseFloat(latestTrade.q)
        const time = latestTrade.T
        const isSell = latestTrade.m // if m is true, buyer is maker, so it's a sell order hitting the bid

        const candleStart = Math.floor(time / CANDLE_DURATION) * CANDLE_DURATION

        let currentCandles = [...candlesRef.current]
        let activeCandle = currentCandles.find(c => c.timestamp === candleStart)

        if (!activeCandle) {
            // Create new candle
            activeCandle = {
                timestamp: candleStart,
                open: price,
                close: price,
                high: price,
                low: price,
                volumeAtPrice: {}
            }
            // Keep only last 5 candles to avoid overcrowding
            if (currentCandles.length >= 5) {
                currentCandles.shift()
            }
            currentCandles.push(activeCandle)
        }

        // Update Candle
        activeCandle.close = price
        activeCandle.high = Math.max(activeCandle.high, price)
        activeCandle.low = Math.min(activeCandle.low, price)

        const priceKey = price.toFixed(1) // Group by 0.1 tick size
        if (!activeCandle.volumeAtPrice[priceKey]) {
            activeCandle.volumeAtPrice[priceKey] = { buy: 0, sell: 0 }
        }

        if (isSell) {
            activeCandle.volumeAtPrice[priceKey].sell += qty
        } else {
            activeCandle.volumeAtPrice[priceKey].buy += qty
        }

        candlesRef.current = currentCandles
        setCandles(currentCandles)

    }, [latestTrade])

    return (
        <div un-flex="~ col" un-gap="2" un-border="~ slate-200 rounded" un-p="4">
            <h2 un-text="lg slate-800" un-font="bold">Footprint Chart (1m)</h2>
            <div un-flex="~ gap-2" un-overflow-x="auto" un-pb="2">
                {candles.map((candle) => (
                    <CandleView key={candle.timestamp} candle={candle} />
                ))}
            </div>
        </div>
    )
}

function CandleView({ candle }: { candle: FootprintCandle }) {
    // Sort prices descending
    const prices = Object.keys(candle.volumeAtPrice).sort((a, b) => parseFloat(b) - parseFloat(a))

    // Determine max volume for relative bar sizing
    const maxVol = prices.reduce((max, p) => {
        const v = candle.volumeAtPrice[p]
        return Math.max(max, v.buy, v.sell)
    }, 0)

    return (
        <div un-flex="~ col" un-min-w="40" un-border="~ slate-100" un-text="xs">
            <div un-text="center slate-400 xs" un-mb="1">
                {new Date(candle.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div un-flex="~ col" un-gap="px">
                {prices.map(price => {
                    const vol = candle.volumeAtPrice[price]
                    const buyWidth = (vol.buy / maxVol) * 100
                    const sellWidth = (vol.sell / maxVol) * 100

                    // Highlight High/Low/Open/Close? 
                    // Simpler: Just show the numbers.

                    return (
                        <div key={price} un-grid="~ cols-[1fr_auto_1fr]" un-gap="1" un-items="center" un-h="5" un-hover="bg-slate-50">
                            <div un-position="relative" un-flex="~ justify-end">
                                <div un-position="absolute" un-top="0" un-bottom="0" un-right="0" un-bg="green-100/50" style={{ width: `${buyWidth}%` }}></div>
                                <span un-z="10" un-text="green-700">{vol.buy > 0 ? vol.buy.toFixed(0) : ''}</span>
                            </div>

                            <div un-w="16" un-text="center slate-500">{price}</div>

                            <div un-position="relative">
                                <div un-absolute="" un-top="0" un-bottom="0" un-left="0" un-bg="red-100/50" style={{ width: `${sellWidth}%` }}></div>
                                <span un-z="10" un-text="red-700">{vol.sell > 0 ? vol.sell.toFixed(0) : ''}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
