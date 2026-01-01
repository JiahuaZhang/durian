import { createFileRoute } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { PhysicalTFFChart } from '../components/PhysicalTFFChart'

const URL = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json?cftc_contract_market_code=084691&$order=report_date_as_yyyy_mm_dd ASC"

export const Route = createFileRoute('/cot/silver')({
    loader: async () => {
        const res = await fetch(URL)
        if (!res.ok) throw new Error(`Failed to fetch Silver data`)
        const financialData = await res.json()

        return { financialData }
    },
    component: CotPage
})

function CotPage() {
    const { financialData } = Route.useLoaderData()

    return (
        <div un-p="4" un-flex="~ col" un-gap="6" un-h="full" un-overflow-y="auto">
            <div un-flex="~ col" un-gap="6">
                <PhysicalTFFChart data={financialData} />
            </div>

            <div un-bg="slate-50" un-p="4" un-rounded="xl" un-flex="~ gap-3" un-text="slate-800 text-sm">
                <Info className="shrink-0" size={20} />
                <div>
                    <strong>Interpretation Guide (Commodities):</strong>
                    <ul un-list="disc inside" un-mt="1" un-space-y="1">
                        <li><strong>Producers/Merchants (Blue):</strong> Entities that physically deal with the commodity (Miners, Refiners). They are the ultimate "Smart Money".</li>
                        <li><strong>Managed Money (Green):</strong> Hedge funds and CTAs (Speculators). They are trend-followers. Pay attention to extreme positioning.</li>
                        <li><strong>Swap Dealers (Red):</strong> Counterparties for OTC swaps.</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
