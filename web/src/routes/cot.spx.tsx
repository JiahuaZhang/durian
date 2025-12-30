import { createFileRoute } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { TFFChart } from '../components/TFFChart'

const URL = "https://publicreporting.cftc.gov/resource/yw9f-hn96.json?cftc_contract_market_code=13874%2B&$order=report_date_as_yyyy_mm_dd ASC"

export const Route = createFileRoute('/cot/spx')({
  loader: async () => {
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`Failed to fetch TFF data`)

    return { financialData: await res.json() }
  },
  component: CotPage
})

function CotPage() {
  const { financialData } = Route.useLoaderData()

  return (
    <div un-p="4" un-flex="~ col" un-gap="6" un-h="full" un-overflow-y="auto">
      <div un-flex="~ justify-between items-center wrap" un-gap="4">
        <p un-text="sm slate-500">
          Data Source: <span un-font="medium text-slate-700">CFTC TFF Report (S&P 500)</span>
        </p>
      </div>

      <div un-flex="~ col" un-gap="6">
        <TFFChart data={financialData} />
      </div>

      <div un-bg="blue-50" un-p="4" un-rounded="xl" un-flex="~ gap-3" un-text="blue-800 text-sm">
        <Info className="shrink-0" size={20} />
        <div>
          <strong>Interpretation Guide:</strong>
          <ul un-list="disc inside" un-mt="1" un-space-y="1">
            <li><strong>Asset Managers (Blue):</strong> Institutional investors (pension funds, endowments). Often trend-following but slow moving. Can be considered "Smart Money" in long horizons.</li>
            <li><strong>Leveraged Funds (Green):</strong> Hedge funds and CTAs. Highly speculative and trend-following. Pay attention when they reach extremes or diverge from price.</li>
            <li><strong>Dealers (Red):</strong> The "Smart Money" intermediaries. They take the other side of trade. If Dealers are Net Long in a downtrend, it can signal accumulation.</li>
          </ul>
        </div>
      </div>

    </div>
  )
}
