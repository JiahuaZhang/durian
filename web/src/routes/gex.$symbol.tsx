import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/gex/$symbol')({
    component: GexSymbolPage,
    loader: ({ params }) => {
        return { symbol: params.symbol }
    }
})

function GexSymbolPage() {
    const { symbol } = Route.useLoaderData()

    return (
        <div un-p="4" un-flex="~ col" un-gap="4">
            <div un-flex="~ justify-between items-center">
                <h2 un-text="xl font-bold slate-800">Gamma Exposure: {symbol.toUpperCase()}</h2>
            </div>

            <div un-p="8" un-bg="slate-50" un-rounded="xl" un-border="~ slate-200 dashed" un-flex="~ center" un-min-h="400px">
                <div un-text="center slate-500">
                    <p un-text="lg font-medium">Chart Placeholder</p>
                    <p un-text="sm">Data visualization for {symbol} GEX is under construction.</p>
                </div>
            </div>
        </div>
    )
}
