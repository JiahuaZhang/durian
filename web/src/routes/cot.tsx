import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'

export const Route = createFileRoute('/cot')({
  component: CotLayout,
})

function CotLayout() {
  return (
    <div un-flex="~ col">
      <div un-flex="~ items-center gap-4" un-p="2" un-border="b slate-200">
        <div un-flex="~ items-center gap-2">
          <LayoutDashboard size={20} un-text="slate-500" />
          <span un-font="semibold" un-text="slate-700">COT Reports</span>
        </div>

        <nav un-flex="~ gap-2">
          <Link
            to="/cot/spx"
            activeProps={{ className: 'bg-blue-50 text-blue-800' }}
            inactiveProps={{ className: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700' }}
            un-p="x-3 y-1.5" un-text="sm" un-border="rounded"
          >
            S&P 500
          </Link>

          {/* Placeholders for Future */}
          <span un-px="3" un-py="1.5" un-text="sm slate-400" title="Coming Soon">Nasdaq (NDX)</span>
          <span un-px="3" un-py="1.5" un-text="sm slate-400" title="Coming Soon">Gold</span>
          <span un-px="3" un-py="1.5" un-text="sm slate-400" title="Coming Soon">Silver</span>
        </nav>
      </div>

      <div un-flex="1">
        <Outlet />
      </div>
    </div>
  )
}
