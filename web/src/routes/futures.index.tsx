import { createFileRoute } from '@tanstack/react-router'
import { TradingViewWithIndicators } from '../components/TradingViewWithIndicators'

export const Route = createFileRoute('/futures/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <TradingViewWithIndicators symbol="SP500" />
    </div>
  )
}
