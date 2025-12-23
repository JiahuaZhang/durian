import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div un-p="8">
      <h1 un-text="4xl transparent" un-font-bold="~" un-bg-gradient-to-r="~" un-from-cyan-600="~" un-to-blue-600="~" un-bg-clip-text="~" un-mb="6">
        Welcome Back
      </h1>

      <div un-grid="~ cols-1 md:cols-2 lg:cols-3" un-gap="6">
        <div un-p="6" un-rounded-2xl="~" un-bg="white" un-border="~" un-border-slate="200" un-shadow-sm="~" un-hover="border-blue-500/30 shadow-md" un-transition-all="~">
          <h3 un-text-xl="~" un-font-semibold="~" un-mb="2" un-text-slate="800">Market Overview</h3>
          <p un-text-slate="500">Loading market interactions...</p>
        </div>

        <div un-p="6" un-rounded-2xl="~" un-bg="white" un-border="~" un-border-slate="200" un-shadow-sm="~" un-hover="border-purple-500/30 shadow-md" un-transition-all="~">
          <h3 un-text-xl="~" un-font-semibold="~" un-mb="2" un-text-slate="800">Recent Trades</h3>
          <p un-text-slate="500">No recent activity found.</p>
        </div>

        <div un-p="6" un-rounded-2xl="~" un-bg="white" un-border="~" un-border-slate="200" un-shadow-sm="~" un-hover="border-blue-500/30 shadow-md" un-transition-all="~">
          <h3 un-text-xl="~" un-font-semibold="~" un-mb="2" un-text-slate="800">Portfolio Value</h3>
          <p un-text-slate="500">$0.00</p>
        </div>
      </div>
    </div>
  )
}
