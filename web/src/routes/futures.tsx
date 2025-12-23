import { createFileRoute } from '@tanstack/react-router'
import React, { Suspense } from 'react'

const AdvancedRealTimeChart = React.lazy(() =>
    import('react-ts-tradingview-widgets').then((mod) => ({
        default: mod.AdvancedRealTimeChart,
    })),
)

export const Route = createFileRoute('/futures')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div un-h="full" un-w="full" un-flex="~ col" un-p="4">
            <h1 un-text="2xl" un-font-bold="~" un-mb="4" un-text-slate="800">
                Futures Market
            </h1>
            <div
                un-flex="1"
                un-rounded="xl"
                un-overflow="hidden"
                un-border="~ slate-200"
                un-shadow="sm"
                un-max="h-xl w-6xl"
            >
                <Suspense fallback={<div>Loading Chart...</div>}>
                    <AdvancedRealTimeChart
                        symbol="SPX"
                        theme="light"
                        width="100%"
                        height="100%"
                        interval="D"
                        autosize
                    />
                </Suspense>
            </div>
        </div>
    )
}
