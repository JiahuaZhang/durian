import { createFileRoute } from '@tanstack/react-router'
import { createChart, HistogramSeries } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { getGexData, type GexProfile, type GexStrikeData } from '../utils/yahoo'

export const Route = createFileRoute('/gex/$symbol')({
    component: GexSymbolPage,
    loader: async ({ params }) => {
        try {
            const data = await getGexData(params.symbol)
            return { symbol: params.symbol, data }
        } catch (e) {
            console.error(e)
            return { symbol: params.symbol, data: null, error: String(e) }
        }
    }
})

function GexSymbolPage() {
    const { symbol, data, error } = Route.useLoaderData()

    if (error || !data) {
        return (
            <div un-p="4">
                <h2 un-text="xl font-bold slate-800">Gamma Exposure: {symbol.toUpperCase()}</h2>
                <div un-p="8" un-bg="red-50" un-text="red-600" un-rounded="xl" un-mt="4">
                    Error loading data: {error || 'Unknown error'}
                </div>
            </div>
        )
    }

    return (
        <div un-p="4" un-flex="~ col" un-gap="6">
            <div un-flex="~ justify-between items-center">
                <h2 un-text="xl font-bold slate-800">Gamma Exposure: {symbol.toUpperCase()}</h2>
                <div un-text="sm slate-500">
                    Expiry: {data.expirationDate} | Price: ${data.price.toFixed(2)}
                </div>
            </div>

            <div un-grid="~ cols-1 md:cols-3" un-gap="4">
                <StatCard label="Total Net GEX" value={formatCurrency(data.totalNetGex)}
                    sub={data.totalNetGex > 0 ? 'Bullish / Stability' : 'Bearish / Volatility'}
                    color={data.totalNetGex > 0 ? 'text-green-600' : 'text-red-600'}
                />
            </div>

            <div un-bg="white" un-rounded="xl" un-shadow="sm" un-border="~ slate-200" un-p="4">
                <h3 un-text="lg font-medium slate-700" un-mb="4">GEX Profile by Strike</h3>
                <GexChart data={data} />
            </div>
        </div>
    )
}

function StatCard({ label, value, sub, color }: { label: string, value: string, sub?: string, color?: string }) {
    return (
        <div un-p="4" un-bg="white" un-rounded="xl" un-border="~ slate-200" un-shadow="sm">
            <div un-text="sm slate-500 font-medium">{label}</div>
            <div un-text={`2xl font-bold ${color || 'slate-800'}`}>{value}</div>
            {sub && <div un-text="xs slate-400" un-mt="1">{sub}</div>}
        </div>
    )
}

function GexChart({ data }: { data: GexProfile }) {
    const chartContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        // Filter to relevant range (+/- 15% of spot)
        const lower = data.price * 0.85
        const upper = data.price * 1.15
        const filteredStrikes = data.strikes.filter(s => s.strike >= lower && s.strike <= upper)

        const chart = createChart(chartContainerRef.current, {
            localization: {
                timeFormatter: (time: number) => time
            },
            timeScale: {
                borderColor: '#e2e8f0',
                tickMarkFormatter: (time: number) => time.toString(),
            }
        })

        const gexSeries = chart.addSeries(HistogramSeries, {
            priceFormat: {
                type: 'custom',
                formatter: (price: number) => formatCurrency(price),
            },
            lastValueVisible: false,
        })

        // Convert strikes to chart data format
        // Using strike as "time" (x-axis) - lightweight-charts expects time but we use it as category
        const chartData = filteredStrikes.map((s: GexStrikeData) => ({
            time: s.strike as unknown as any, // strike price as x-axis
            value: s.totalGex,
            color: s.totalGex > 0 ? '#22c55e' : '#ef4444',
        }))

        gexSeries.setData(chartData)

        chart.timeScale().fitContent()

        return () => chart.remove()
    }, [data])

    return (
        <div
            ref={chartContainerRef}
            un-w="full"
            un-h="400px"
            un-rounded="xl"
        />
    )
}

function formatCurrency(val: number) {
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`
    if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`
    return `$${val.toFixed(0)}`
}
