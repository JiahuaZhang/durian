import { ClientOnly } from '@tanstack/react-router'
import { useState } from 'react'
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets'

const indicators = [
    { label: 'SMA', value: 'SMA_GROUP', group: true },
    { label: 'EMA', value: 'EMA_GROUP', group: true },
    { label: 'RSI', value: 'RSI@tv-basicstudies' },
    { label: 'MACD', value: 'MACD@tv-basicstudies' },
    { label: 'Bollinger Bands', value: 'BB@tv-basicstudies' },
] as const

const smaGroup = [
    { id: 'MASimple@tv-basicstudies', inputs: { length: 20 }, overrides: { "plot.color": "#FF9800" } },
    { id: 'MASimple@tv-basicstudies', inputs: { length: 50 }, overrides: { "plot.color": "#F44336" } },
    { id: 'MASimple@tv-basicstudies', inputs: { length: 200 }, overrides: { "plot.color": "#2962FF" } },
]

const emaGroup = [
    { id: 'MAExp@tv-basicstudies', inputs: { length: 20 }, overrides: { "plot.color": "#00BCD4" } },
    { id: 'MAExp@tv-basicstudies', inputs: { length: 50 }, overrides: { "plot.color": "#E91E63" } },
]

type TradingViewWithIndicatorsProps = {
    symbol: string
}

export function TradingViewWithIndicators({ symbol }: TradingViewWithIndicatorsProps) {
    const [activeStudies, setActiveStudies] = useState<any[]>([
        { id: 'MASimple@tv-basicstudies', inputs: { length: 20 }, overrides: { "plot.color": "#FF9800" } },
        { id: 'MASimple@tv-basicstudies', inputs: { length: 50 }, overrides: { "plot.color": "#2962FF" } },
        'RSI@tv-basicstudies'
    ])

    const toggleIndicator = (ind: typeof indicators[number]) => {
        if (ind.value === 'SMA_GROUP') {
            const isPresent = activeStudies.some(s => typeof s === 'object' && s.id === 'MASimple@tv-basicstudies')
            if (isPresent) {
                setActiveStudies(prev => prev.filter(s => !(typeof s === 'object' && s.id === 'MASimple@tv-basicstudies')))
            } else {
                setActiveStudies(prev => [...prev, ...smaGroup])
            }
            return
        }

        if (ind.value === 'EMA_GROUP') {
            const isPresent = activeStudies.some(s => typeof s === 'object' && s.id === 'MAExp@tv-basicstudies')
            if (isPresent) {
                setActiveStudies(prev => prev.filter(s => !(typeof s === 'object' && s.id === 'MAExp@tv-basicstudies')))
            } else {
                setActiveStudies(prev => [...prev, ...emaGroup])
            }
            return
        }

        const value = ind.value
        if (activeStudies.includes(value)) {
            setActiveStudies(prev => prev.filter(i => i !== value))
        } else {
            setActiveStudies(prev => [...prev, value])
        }
    }

    const isActive = (ind: typeof indicators[number]) => {
        if (ind.value === 'SMA_GROUP') return activeStudies.some(s => typeof s === 'object' && s.id === 'MASimple@tv-basicstudies')
        if (ind.value === 'EMA_GROUP') return activeStudies.some(s => typeof s === 'object' && s.id === 'MAExp@tv-basicstudies')
        return activeStudies.includes(ind.value)
    }

    return (
        <div un-flex="~ col gap-2" un-p='2'>
            <div un-flex="~ gap-2">
                {indicators.map((ind) => (
                    <button
                        key={ind.value}
                        onClick={() => toggleIndicator(ind)}
                        un-p="x-3 y-1"
                        un-cursor='pointer'
                        un-rounded="lg"
                        un-text={`sm ${isActive(ind) ? 'white' : 'slate-600'}`}
                        un-border={isActive(ind) ? 'transparent' : '~ slate-200'}
                        un-bg={isActive(ind) ? 'blue-500 hover:blue-700' : 'transparent hover:slate-50'}
                    >
                        {ind.label}
                    </button>
                ))}
            </div>

            <div un-h="150" un-w='250' >
                <ClientOnly>
                    <AdvancedRealTimeChart
                        symbol={symbol}
                        theme="light"
                        interval="D"
                        autosize
                        studies={activeStudies}
                    />
                </ClientOnly>
            </div>
        </div>
    )
}
