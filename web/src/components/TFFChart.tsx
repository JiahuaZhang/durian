import { createChart, LineSeries } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

export type RawTFFData = {
    id: string
    market_and_exchange_names: string
    report_date_as_yyyy_mm_dd: string
    yyyy_report_week_ww: string
    contract_market_name: string
    cftc_contract_market_code: string
    cftc_market_code: string
    cftc_region_code: string
    cftc_commodity_code: string
    commodity_name: string
    open_interest_all: string
    dealer_positions_long_all: string
    dealer_positions_short_all: string
    dealer_positions_spread_all: string
    asset_mgr_positions_long: string
    asset_mgr_positions_short: string
    asset_mgr_positions_spread: string
    lev_money_positions_long: string
    lev_money_positions_short: string
    lev_money_positions_spread: string
    other_rept_positions_long: string
    other_rept_positions_short: string
    other_rept_positions_spread: string
    tot_rept_positions_long_all: string
    tot_rept_positions_short: string
    nonrept_positions_long_all: string
    nonrept_positions_short_all: string
    pct_of_open_interest_all: string
    pct_of_oi_dealer_long_all: string
    pct_of_oi_dealer_short_all: string
    pct_of_oi_dealer_spread_all: string
    pct_of_oi_asset_mgr_long: string
    pct_of_oi_asset_mgr_short: string
    pct_of_oi_asset_mgr_spread: string
    pct_of_oi_lev_money_long: string
    pct_of_oi_lev_money_short: string
    pct_of_oi_lev_money_spread: string
    pct_of_oi_other_rept_long: string
    pct_of_oi_other_rept_short: string
    pct_of_oi_other_rept_spread: string
    pct_of_oi_tot_rept_long_all: string
    pct_of_oi_tot_rept_short: string
    pct_of_oi_nonrept_long_all: string
    pct_of_oi_nonrept_short_all: string
    traders_tot_all: string
    traders_dealer_long_all: string
    traders_dealer_short_all: string
    traders_dealer_spread_all: string
    traders_asset_mgr_long_all: string
    traders_asset_mgr_short_all: string
    traders_asset_mgr_spread: string
    traders_lev_money_long_all: string
    traders_lev_money_short_all: string
    traders_lev_money_spread: string
    traders_other_rept_long_all: string
    traders_other_rept_short: string
    traders_other_rept_spread: string
    traders_tot_rept_long_all: string
    traders_tot_rept_short_all: string
    conc_gross_le_4_tdr_long: string
    conc_gross_le_4_tdr_short: string
    conc_gross_le_8_tdr_long: string
    conc_gross_le_8_tdr_short: string
    conc_net_le_4_tdr_long_all: string
    conc_net_le_4_tdr_short_all: string
    conc_net_le_8_tdr_long_all: string
    conc_net_le_8_tdr_short_all: string
    contract_units: string
    cftc_subgroup_code: string
    commodity: string
    commodity_subgroup_name: string
    commodity_group_name: string
    futonly_or_combined: string
    [key: string]: string | number
}

export type SeriesKey =
    | 'assetManagers'
    | 'leveragedFunds'
    | 'dealers'
    | 'otherReportables'
    | 'commercials'
    | 'nonCommercials'

type ProcessedPoint = {
    time: string
    [key: string]: number | string
}

const seriesConfig = [
    { key: 'assetManagers', label: 'Asset Managers', color: '#2563eb' },
    { key: 'leveragedFunds', label: 'Leveraged Funds', color: '#16a34a' },
    { key: 'dealers', label: 'Dealers', color: '#dc2626' },
    { key: 'otherReportables', label: 'Other Reportables', color: '#94a3b8' }
]

export function TFFChart({ data }: { data: RawTFFData[] }) {
    const chartContainerRef = useRef<HTMLDivElement>(null)

    const processedData: ProcessedPoint[] = data
        .map(row => {
            const date = String(row.report_date_as_yyyy_mm_dd).split('T')[0]

            const fn = (val: string | number | undefined) => parseInt(String(val || '0'), 10)

            const assetManagers = fn(row.asset_mgr_positions_long) - fn(row.asset_mgr_positions_short)
            const leveragedFunds = fn(row.lev_money_positions_long) - fn(row.lev_money_positions_short)
            const dealers = fn(row.dealer_positions_long_all) - fn(row.dealer_positions_short_all)
            const otherReportables = fn(row.other_rept_positions_long_all) - fn(row.other_rept_positions_short_all)

            return {
                time: date,
                assetManagers,
                leveragedFunds,
                dealers,
                otherReportables
            }
        })

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current)

        seriesConfig.forEach(conf => {
            const series = chart.addSeries(LineSeries, {
                color: conf.color,
                lineWidth: 2,
                title: conf.label,
                priceScaleId: 'right',
            })

            const seriesData = processedData.map(d => ({
                time: d.time,
                value: Number(d[conf.key] ?? 0)
            }))

            series.setData(seriesData)
        })

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth })
            }
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [processedData])

    return (
        <div un-border="~ slate-200 rounded" un-shadow="sm" un-p="2" un-overflow="hidden">
            <div un-flex="~ gap-4" un-justify="end">
                {seriesConfig.map((conf) => (
                    <div key={conf.key} un-flex="~ gap-2 items-center">
                        <div un-w="2" un-h="2" un-rounded="full" style={{ backgroundColor: conf.color }}></div>
                        <span un-text="xs" style={{ color: conf.color }}>{conf.label}</span>
                    </div>
                ))}
            </div>

            <div ref={chartContainerRef} un-h="100" />
        </div>
    )
}
