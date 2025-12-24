import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AdvancedRealTimeChart, type Studies } from 'react-ts-tradingview-widgets'

export const Route = createFileRoute('/futures')({
    component: RouteComponent,
})

const indicators = [
    { label: 'SMA', value: 'MASimple@tv-basicstudies' },
    { label: 'EMA', value: 'MAExp@tv-basicstudies' },
    { label: 'RSI', value: 'RSI@tv-basicstudies' },
    { label: 'MACD', value: 'MACD@tv-basicstudies' },
    { label: 'Bollinger Bands', value: 'BB@tv-basicstudies' },
] as const

function RouteComponent() {
    const [activeStudies, setActiveStudies] = useState<Studies[]>(['MASimple@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'])

    const toggleIndicator = (value: Studies) => {
        setActiveStudies((prev) => prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value])
    }

    return (
        <div un-h="full" un-w="full" un-flex="~ col gap-2" un-p='2' >
            <div un-flex="~ gap-2">
                {indicators.map((ind) => (
                    <button
                        key={ind.value}
                        onClick={() => toggleIndicator(ind.value)}
                        un-p="x-3 y-1"
                        un-cursor='pointer'
                        un-rounded="lg"
                        un-text={`sm ${activeStudies.includes(ind.value) ? 'white' : 'slate-600'}`}
                        un-border={activeStudies.includes(ind.value) ? 'transparent' : '~ slate-200'}
                        un-bg={activeStudies.includes(ind.value) ? 'blue-500 hover:blue-700' : 'transparent hover:slate-50'}
                    >
                        {ind.label}
                    </button>
                ))}
            </div>

            <div
                un-flex="1"
                un-rounded="xl"
                un-overflow="hidden"
                un-border="~ slate-200"
                un-shadow="sm"
                un-max="h-xl w-6xl"
            >
                <ClientOnly>
                    <AdvancedRealTimeChart
                        symbol="SP500"
                        theme="light"
                        width="100%"
                        height="100%"
                        interval="D"
                        autosize
                        studies={activeStudies}
                    />
                </ClientOnly>
            </div>
        </div>
    )
}
