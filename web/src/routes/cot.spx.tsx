import { createFileRoute } from '@tanstack/react-router'
import { ColorType, createChart, ISeriesApi, LineSeries, LineStyle } from 'lightweight-charts'
import { Info } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface FinancialDataPoint {
  date: string
  assetManagers: number
  leveragedFunds: number
  dealers: number
  otherReportables: number
  openInterest: number
}

const URL = "https://publicreporting.cftc.gov/resource/yw9f-hn96.json?cftc_contract_market_code=13874%2B&$order=report_date_as_yyyy_mm_dd%20DESC"

export const Route = createFileRoute('/cot/spx')({
  loader: async () => {
    const res = await fetch(URL)
    if (!res.ok) throw new Error(`Failed to fetch TFF data`)

    const rawTff = await res.json()

    // Parse Financial (TFF)
    const financialData: FinancialDataPoint[] = rawTff.map((row: any) => ({
      date: row.report_date_as_yyyy_mm_dd.split('T')[0],
      openInterest: parseInt(row.open_interest_all || '0'),
      assetManagers: parseInt(row.asset_mgr_positions_long || '0') - parseInt(row.asset_mgr_positions_short || '0'),
      leveragedFunds: parseInt(row.lev_money_positions_long || '0') - parseInt(row.lev_money_positions_short || '0'),
      dealers: parseInt(row.dealer_positions_long_all || '0') - parseInt(row.dealer_positions_short_all || '0'),
      otherReportables: parseInt(row.other_rept_positions_long_all || '0') - parseInt(row.other_rept_positions_short_all || '0'),
    })).reverse()

    return { financialData }
  },
  component: CotPage
})

function CotLWChart({
  data,
  minHeight = 350,
  seriesConfig,
  title,
  subtitle
}: {
  data: any[],
  minHeight?: number,
  title: string,
  subtitle: string,
  seriesConfig: { key: string, label: string, color: string }[]
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'white' },
        textColor: '#334155',
      },
      width: chartContainerRef.current.clientWidth,
      height: minHeight,
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
      },
    })

    const seriesMap = new Map<string, ISeriesApi<"Line">>()

    // Add Zero Line
    const zeroLine = chart.addSeries(LineSeries, {
      color: '#94a3b8',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    })
    zeroLine.setData(data.map(d => ({ time: d.date, value: 0 })))

    // Add Data Series
    seriesConfig.forEach(conf => {
      const series = chart.addSeries(LineSeries, {
        color: conf.color,
        lineWidth: 2,
        title: conf.label,
        priceScaleId: 'right',
      })

      const seriesData = data.map(d => ({
        time: d.date,
        value: d[conf.key]
      }))

      series.setData(seriesData)
      seriesMap.set(conf.key, series)
    })

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, seriesConfig, minHeight])

  const latest = data[data.length - 1]

  return (
    <div un-bg="white" un-rounded="xl" un-border="~ slate-200" un-shadow="sm" un-p="4" un-overflow="hidden">
      <div un-flex="~ justify-between items-start" un-mb="4">
        <div>
          <h3 un-text="lg slate-700" un-font="semibold">{title}</h3>
          <p un-text="xs slate-400">{subtitle}</p>
        </div>
        <div un-flex="~ gap-4 wrap" un-justify="end">
          {seriesConfig.map((conf) => (
            <div key={conf.key} un-flex="~ col items-end">
              <div un-flex="~ items-center gap-1">
                <div un-w="2" un-h="2" un-rounded="full" style={{ backgroundColor: conf.color }}></div>
                <span un-text="xs font-medium" style={{ color: conf.color }}>
                  {conf.label}
                </span>
              </div>
              <span un-text="sm font-mono slate-700 font-bold">
                {latest?.[conf.key]?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} un-w="full" />
    </div>
  )
}


function CotPage() {
  const { financialData } = Route.useLoaderData()

  return (
    <div un-p="4" un-flex="~ col" un-gap="6" un-h="full" un-overflow-y="auto">
      <div un-flex="~ justify-between items-center wrap" un-gap="4">
        <p un-text="sm slate-500">
          Data Source: <span un-font="medium text-slate-700">S&P 500 Consolidated (Standard + E-mini + Micro)</span>
        </p>
      </div>

      <div un-flex="~ col" un-gap="6">
        <CotLWChart
          title="Financial Futures (TFF)"
          subtitle="Asset Managers (Real Money) vs Leveraged Funds (Fast Money)"
          data={financialData}
          seriesConfig={[
            { key: 'assetManagers', label: 'Asset Managers', color: '#2563eb' },
            { key: 'leveragedFunds', label: 'Leveraged Funds', color: '#16a34a' },
            { key: 'dealers', label: 'Dealers', color: '#dc2626' },
            { key: 'otherReportables', label: 'Other Reportables', color: '#94a3b8' }
          ]}
        />
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
