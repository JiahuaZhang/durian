import { createChart, LineSeries, LineStyle } from 'lightweight-charts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Stochastic } from 'technicalindicators'

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
    [key: string]: string
}

export type SeriesKey =
    | 'assetManagers'
    | 'leveragedFunds'
    | 'dealers'
    | 'otherReportables'
    | 'commercials'
    | 'nonCommercials'

export type ProcessedPoint = {
    time: string
    assetManagers: number
    leveragedFunds: number
    dealers: number
    otherReportables: number
    assetManagerIndex?: number
    leveragedFundIndex?: number
}

const seriesConfig = [
    { key: 'assetManagers', label: 'Asset Managers', color: '#2563eb' },
    { key: 'leveragedFunds', label: 'Leveraged Funds', color: '#16a34a' },
    { key: 'dealers', label: 'Dealers', color: '#dc2626' },
    { key: 'otherReportables', label: 'Other Reportables', color: '#94a3b8' }
]

export function processTFFData(data: RawTFFData[]): ProcessedPoint[] {
    const sortedRaw = data.slice().sort((a, b) => String(a.report_date_as_yyyy_mm_dd || '').localeCompare(String(b.report_date_as_yyyy_mm_dd || '')))

    const fn = (val: string) => Number(val ?? '0')

    const rawValues = sortedRaw.map(row => ({
        time: row.report_date_as_yyyy_mm_dd.split('T')[0],
        assetManagers: fn(row.asset_mgr_positions_long) - fn(row.asset_mgr_positions_short),
        leveragedFunds: fn(row.lev_money_positions_long) - fn(row.lev_money_positions_short),
        dealers: fn(row.dealer_positions_long_all) - fn(row.dealer_positions_short_all),
        otherReportables: fn(row.other_rept_positions_long_all) - fn(row.other_rept_positions_short_all)
    }))

    // Calculate COT Index using Stochastic (Williams %R logic but 0-100)
    // Stochastic (raw %K) = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
    // We pass the single series as High, Low, and Close.
    const period = 52

    // Asset Managers Index
    const amValues = rawValues.map(d => d.assetManagers)
    const amStoch = Stochastic.calculate({
        high: amValues,
        low: amValues,
        close: amValues,
        period: period,
        signalPeriod: 3
    })

    // Leveraged Funds Index
    const lfValues = rawValues.map(d => d.leveragedFunds)
    const lfStoch = Stochastic.calculate({
        high: lfValues,
        low: lfValues,
        close: lfValues,
        period: period,
        signalPeriod: 3
    })

    // Map back. Stochastic result length = input length - period + 1
    // The result[0] corresponds to the period-th element (index period-1)
    const resultOffset = period - 1

    return rawValues.map((point, i) => {
        let amIndex: number | undefined
        let lfIndex: number | undefined

        if (i >= resultOffset) {
            const indexInResult = i - resultOffset
            // Stochastic returns object usually { k, d }, we want k
            if (amStoch[indexInResult]) amIndex = amStoch[indexInResult].k
            if (lfStoch[indexInResult]) lfIndex = lfStoch[indexInResult].k
        }

        return {
            ...point,
            // Fallback to 50 or undefined for warmup period
            assetManagerIndex: amIndex ?? 50,
            leveragedFundIndex: lfIndex ?? 50
        }
    })
}

export function TFFChart({ data }: { data: RawTFFData[] }) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const processedData = useMemo(() => processTFFData(data), [data])
    const [legend, setLegend] = useState<any>(null)

    useEffect(() => {
        if (!chartContainerRef.current) return

        const chart = createChart(chartContainerRef.current, { rightPriceScale: { scaleMargins: { top: 0.05, bottom: 0.45 } } })

        const seriesMap = new Map<any, string>()

        seriesConfig.forEach(conf => {
            const series = chart.addSeries(LineSeries, {
                color: conf.color, lineWidth: 2, title: conf.label, priceScaleId: 'right',
            })
            series.setData(processedData.map(d => ({ time: d.time, value: Number((d as any)[conf.key] ?? 0) })))
            seriesMap.set(series, conf.label)
        })

        const amScaleId = 'am-scale'
        const amSeries = chart.addSeries(LineSeries, {
            priceScaleId: amScaleId, color: '#2563eb', lineWidth: 2, title: 'Asset Manager Index'
        })
        amSeries.setData(processedData.map(d => ({ time: d.time, value: d.assetManagerIndex ?? 50 })))
        seriesMap.set(amSeries, 'AM Index')

        chart.priceScale(amScaleId).applyOptions({ scaleMargins: { top: 0.60, bottom: 0.22 } })

        const addIndexExtras = (scaleId: string) => {
            const b0 = chart.addSeries(LineSeries, { priceScaleId: scaleId, visible: false, lastValueVisible: false, priceLineVisible: false })
            const b100 = chart.addSeries(LineSeries, { priceScaleId: scaleId, visible: false, lastValueVisible: false, priceLineVisible: false })
            b0.setData(processedData.map(d => ({ time: d.time, value: 0 })))
            b100.setData(processedData.map(d => ({ time: d.time, value: 100 })))
            const top = chart.addSeries(LineSeries, { priceScaleId: scaleId, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
            const bot = chart.addSeries(LineSeries, { priceScaleId: scaleId, color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
            top.setData(processedData.map(d => ({ time: d.time, value: 90 })))
            bot.setData(processedData.map(d => ({ time: d.time, value: 10 })))
        }
        addIndexExtras(amScaleId)


        const lfScaleId = 'lf-scale'
        const lfSeries = chart.addSeries(LineSeries, {
            priceScaleId: lfScaleId, color: '#16a34a', lineWidth: 2, title: 'Leveraged Fund Index'
        })
        lfSeries.setData(processedData.map(d => ({ time: d.time, value: d.leveragedFundIndex ?? 50 })))
        seriesMap.set(lfSeries, 'LF Index')

        chart.priceScale(lfScaleId).applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        addIndexExtras(lfScaleId)

        chart.subscribeCrosshairMove((param) => {
            if (param.time && param.point) {
                const data: any = { date: param.time }
                param.seriesData.forEach((value, series) => {
                    const label = seriesMap.get(series)
                    if (label) {
                        data[label] = (value as any).value
                    }
                })
                setLegend(data)
            } else {
                setLegend(null)
            }
        })

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth })
            }
        }
        window.addEventListener('resize', handleResize)

        setTimeout(() => chart.timeScale().fitContent(), 0)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
        }
    }, [processedData])

    return (
        <div un-border="~ slate-200 rounded" un-shadow="sm" un-p="2">
            <div un-flex="~ gap-6 wrap" un-items="center" un-mb="2" un-px="2">
                <div un-flex="~ gap-3" un-border-r="~ slate-200" un-pr="4">
                    {seriesConfig.map((conf) => (
                        <div key={conf.key} un-flex="~ gap-1 items-center">
                            <div un-w="2" un-h="2" un-rounded="full" style={{ backgroundColor: conf.color }}></div>
                            <span un-text="xs" style={{ color: conf.color }}>{conf.label}</span>
                        </div>
                    ))}
                </div>

                <div un-flex="~ gap-3">
                    <div un-flex="~ items-center gap-1">
                        <div un-w="2" un-h="2" un-rounded="full" un-bg="blue-600"></div>
                        <span un-text="xs slate-600">Asset Manager Index</span>
                    </div>
                    <div un-flex="~ items-center gap-1">
                        <div un-w="2" un-h="2" un-rounded="full" un-bg="green-600"></div>
                        <span un-text="xs slate-600">Leveraged Fund Index</span>
                    </div>
                </div>
            </div>

            <div un-position="relative" un-h="200" un-w="full">
                {legend && (
                    <div un-position="absolute top-2 left-2" un-z="10" un-p="2" un-shadow="sm" un-border="~ slate-100 rounded" un-text="xs" un-font="mono">
                        <div un-text="slate-500 mb-1">{legend.date}</div>
                        {seriesConfig.map(conf => {
                            const val = legend[conf.label]
                            if (val === undefined) return null
                            return (
                                <div key={conf.key} un-flex="~ gap-2 justify-between">
                                    <span style={{ color: conf.color }}>{conf.label}:</span>
                                    <span>{val.toLocaleString()}</span>
                                </div>
                            )
                        })}
                        <div un-h="1px" un-bg="slate-100" un-my="1" />
                        {legend['AM Index'] !== undefined && (
                            <div un-flex="~ gap-2 justify-between">
                                <span un-text="blue-600">Asset Manager Index:</span>
                                <span>{legend['AM Index'].toLocaleString()}</span>
                            </div>
                        )}
                        {legend['LF Index'] !== undefined && (
                            <div un-flex="~ gap-2 justify-between">
                                <span un-text="green-600">Leveraged Fund Index:</span>
                                <span>{legend['LF Index'].toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}
                <div ref={chartContainerRef} un-h="full" un-w="full" />
            </div>
        </div>
    )
}
