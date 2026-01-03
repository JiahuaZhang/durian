import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/gex')({
  component: GexLayout,
})

const tabs = [
  { name: 'S&P 500', to: '/gex/spx' },
  { name: 'Nasdaq 100', to: '/gex/ndx' },
  { name: 'Bitcoin', to: '/gex/btc' },
]

function GexLayout() {
  const location = useLocation()

  return (
    <div un-flex="~ col" un-h="full">
      <div un-border="b slate-200" un-p="x-6 y-2" un-flex="~">
        <div un-flex="~ gap-1" un-bg="slate-100" un-p="1" un-rounded="lg">
          {tabs.map(tab => {
            const isActive = location.pathname.startsWith(tab.to)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                un-p="x-3 y-1.5" un-rounded="md" un-transition="colors"
                un-bg={isActive ? 'white' : 'transparent'}
                un-text={`sm ${isActive ? 'slate-900 shadow-sm' : 'slate-500 hover:slate-700'}`}
              >
                {tab.name}
              </Link>
            )
          })}
        </div>
      </div>
      <div un-flex="1" un-overflow="auto">
        <Outlet />
      </div>
    </div>
  )
}
