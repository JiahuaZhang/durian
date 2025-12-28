import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/dom/btc')({
    component: FuturesDOMPage
})

type OrderBookLevel = {
    p: string // Price
    q: string // Quantity
}

const formatPrice = (p: string) => parseFloat(p).toFixed(1)
const formatQty = (q: string) => parseFloat(q).toFixed(3)

function FuturesDOMPage() {
    const [bids, setBids] = useState<OrderBookLevel[]>([])
    const [asks, setAsks] = useState<OrderBookLevel[]>([])
    const [lastPrice, setLastPrice] = useState<string>("")
    const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null)

    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        // Connect to Binance Futures WebSocket for BTCUSDT Depth
        // standard stream name: btcusdt@depth20@100ms
        const ws = new WebSocket('wss://fstream.binance.com/ws/btcusdt@depth20@100ms')
        wsRef.current = ws

        ws.onopen = () => {
            console.log('Connected to Binance WebSocket')
        }

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.b && data.a) {
                const newBids = data.b.map((item: string[]) => ({ p: item[0], q: item[1] }))
                const newAsks = data.a.map((item: string[]) => ({ p: item[0], q: item[1] })).reverse()
                setBids(newBids)
                setAsks(newAsks)
            }
        }

        const tickerWs = new WebSocket('wss://fstream.binance.com/ws/btcusdt@aggTrade')

        tickerWs.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.p) {
                setLastPrice(prev => {
                    if (parseFloat(data.p) > parseFloat(prev)) setPriceDirection("up")
                    else if (parseFloat(data.p) < parseFloat(prev)) setPriceDirection("down")
                    return data.p
                })
            }
        }

        return () => {
            ws.close()
            tickerWs.close()
        }
    }, [])

    const maxBidVol = Math.max(...bids.map(b => parseFloat(b.q)), 1)
    const maxAskVol = Math.max(...asks.map(a => parseFloat(a.q)), 1)
    const maxVol = Math.max(maxBidVol, maxAskVol)

    return (
        <div un-p="2" un-flex="~ col" un-gap="2">
            <div un-flex="~ justify-between items-center">
                <h1 un-text="2xl slate-800" un-font="bold">
                    BTCUSDT Futures DOM
                    <span un-text="sm slate-500" un-font="normal" un-ml="2">(Binance Real-time)</span>
                </h1>
                <div un-flex="~ items-center gap-2">
                    <span un-font="mono bold" un-text={`lg ${priceDirection === "up" ? "green-600" : priceDirection === "down" ? "red-600" : "slate-800"}`}>
                        {lastPrice ? parseFloat(lastPrice).toFixed(1) : "---"}
                    </span>
                    {priceDirection === "up" && <ArrowUp size={20} className="text-green-600" />}
                    {priceDirection === "down" && <ArrowDown size={20} className="text-red-600" />}
                </div>
            </div>

            <div un-flex="1" un-bg="white" un-rounded="xl" un-border="~ slate-200" un-shadow="sm" un-overflow="hidden" un-position="">
                <div un-grid="~ cols-3" un-bg="slate-50" un-border-b="~ slate-200" un-p="y-2" un-text="xs slate-500 center">
                    <div>Bid Vol</div>
                    <div>Price</div>
                    <div>Ask Vol</div>
                </div>

                <div un-h="full" un-overflow-y="auto" un-font="mono">
                    {[...asks].reverse().map((ask, i) => {
                        const vol = parseFloat(ask.q)
                        const widthPct = (vol / maxVol) * 100
                        return (
                            <div key={`ask-${i}`} un-grid="~ cols-3" un-text="sm" un-hover="bg-slate-50">
                                <div />
                                <div un-p="2" un-text="center red-600" un-bg="red-50">{formatPrice(ask.p)}</div>
                                <div un-p="2" un-text="left slate-700" un-position="relative" >
                                    <span>{formatQty(ask.q)}</span>
                                    <div un-position="absolute" un-top="0" un-bottom="0" un-left="0" un-bg="red-100/50" un-transition="all duration-100" style={{ width: `${widthPct}%` }} />
                                </div>
                            </div>
                        )
                    })}

                    <div un-bg="slate-100" un-p="1" un-text="center xs slate-500" un-flex="~ items-center justify-center gap-2">
                        <span un-font="mono bold" un-text={`lg ${priceDirection === "up" ? "green-600" : priceDirection === "down" ? "red-600" : "slate-800"}`}>
                            {lastPrice ? parseFloat(lastPrice).toFixed(1) : "---"}
                        </span>
                        {priceDirection === "up" && <ArrowUp size={20} className="text-green-600" />}
                        {priceDirection === "down" && <ArrowDown size={20} className="text-red-600" />}
                    </div>

                    {bids.map((bid, i) => {
                        const vol = parseFloat(bid.q)
                        const widthPct = (vol / maxVol) * 100
                        return (
                            <div key={`bid-${i}`} un-grid="~ cols-3" un-text="sm" un-hover="bg-slate-50" >
                                <div un-p="2" un-text="right slate-700" un-position="relative">
                                    <span>{formatQty(bid.q)}</span>
                                    <div un-position="absolute" un-top="0" un-bottom="0" un-right="0" un-bg="green-100/50" un-transition="all duration-100" style={{ width: `${widthPct}%` }} />
                                </div>
                                <div un-p="2" un-text="center green-600" un-bg="green-50">{formatPrice(bid.p)}</div>
                                <div />
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
