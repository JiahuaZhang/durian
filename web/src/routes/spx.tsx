import { createFileRoute } from '@tanstack/react-router'
import { MAChart } from '../components/MAChart'
import { fetchYahooData } from '../data/yahoo'

export const Route = createFileRoute('/spx')({
  component: RouteComponent,
  loader: async () => {
    const symbol = '^SPX'
    const interval = '1d'
    const range = '5y'
    const data = await fetchYahooData({ data: { symbol, interval, range } });
    return { data, symbol }
  },
})

function RouteComponent() {
  const { data, symbol } = Route.useLoaderData()
  return (
    <div un-p="4">
      <MAChart data={data} title={symbol} />
    </div>
  )
}
