import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { findMACDCrosses, findMACDDivergences, MACDData } from '../utils/analysis';
import { CandleData } from './AnalysisChart';

type TechnicalSignalsProps = {
    data: CandleData[];
    macdData: MACDData[];
}

export function TechnicalSignals({ data, macdData }: TechnicalSignalsProps) {
    const [showAllCrosses, setShowAllCrosses] = useState(false)
    const [showAllDivergences, setShowAllDivergences] = useState(false)

    const macdCrosses = useMemo(() => findMACDCrosses(macdData), [macdData])
    const macdDivergences = useMemo(() => findMACDDivergences(data, macdData), [data, macdData])

    return (
        <div un-min-w="xs" un-shrink="0" un-max-h="xl" un-border="~ slate-200 rounded-lg" un-bg="slate-50" un-p="3" un-flex="~ col gap-3" un-overflow="y-auto">
            <div un-flex='~ col gap-2'>
                <div un-text="sm center">MACD Crosses</div>
                <div un-flex="~ col gap-1" un-max-h="3xs" un-overflow="y-auto" un-border="none" >
                    {(showAllCrosses ? macdCrosses : macdCrosses.slice(0, 5)).map((cross, i) => (
                        <div key={i} un-flex="~ items-center gap-2" un-text="xs" un-p="1.5" un-bg="white" un-border="rounded">
                            <span un-text={cross.type === 'golden' ? 'green-600' : 'red-600'} un-w="16">
                                {cross.type === 'golden' ? '↗ Golden' : '↘ Dead'}
                            </span>
                            <span un-text="slate-600" un-flex="1">{cross.date}</span>
                            <span un-text="blue-600 right" un-w="12">{cross.macdValue.toFixed(1)}</span>
                            {cross.daysSinceLastCross && (
                                <span un-text="slate-400 right" un-w="8">{cross.daysSinceLastCross}d</span>
                            )}
                        </div>
                    ))}
                </div>
                {macdCrosses.length > 5 && (
                    <button
                        onClick={() => setShowAllCrosses(p => !p)}
                        un-flex="~ items-center justify-center gap-1"
                        un-text="xs slate-500 hover:slate-700"
                        un-cursor="pointer"
                    >
                        {showAllCrosses ? (
                            <><ChevronUp size={14} /> Show less</>
                        ) : (
                            <><ChevronDown size={14} /> Show all ({macdCrosses.length})</>
                        )}
                    </button>
                )}
            </div>

            <div un-border="t slate-200" un-pt="3" un-flex='~ col gap-2' >
                <div un-text="sm center" >MACD Divergences</div>
                <div un-max-h='3xs' un-overflow='y-auto' un-flex="~ col gap-1">
                    {(showAllDivergences ? macdDivergences : macdDivergences.slice(0, 5)).map((div, i) => (
                        <div key={i} un-flex="~ col gap-1" un-text="xs" un-p="1.5" un-bg="white" un-border="rounded">
                            <div un-flex="~ items-center gap-2 justify-between">
                                <span un-text={div.type === 'bullish' ? 'green-600' : 'red-600'}>
                                    {div.type === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
                                </span>
                                <span un-text="slate-500">{div.startDate} → {div.endDate}</span>
                            </div>
                            <div un-text="slate-400" un-flex="~ items-center gap-2 justify-between">
                                <div> Price: </div>
                                <div>
                                    <span un-text={div.type === 'bullish' ? 'green-600' : 'red-600'} >
                                        {div.startPrice.toFixed(1)}
                                    </span>
                                    <span un-text={div.type === 'bullish' ? 'red-600' : 'green-600'} >
                                        {' '} → {div.endPrice.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                            <div un-text="slate-400" un-flex="~ items-center gap-2 justify-between">
                                <div> MACD: </div>
                                <div>
                                    <span un-text={div.type === 'bullish' ? 'red-600' : 'green-600'}>
                                        {div.startMacd.toFixed(1)}
                                    </span>
                                    <span un-text={div.type === 'bullish' ? 'green-600' : 'red-600'}>
                                        {' '} → {div.endMacd.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {macdDivergences.length === 0 && (
                        <div un-text="xs slate-400" un-p="2">No divergences detected</div>
                    )}
                </div>
                {macdDivergences.length > 5 && (
                    <button
                        onClick={() => setShowAllDivergences(p => !p)}
                        un-flex="~ items-center justify-center gap-1"
                        un-text="xs slate-500 hover:slate-700"
                        un-cursor="pointer"
                    >
                        {showAllDivergences ? (
                            <><ChevronUp size={14} /> Show less</>
                        ) : (
                            <><ChevronDown size={14} /> Show all ({macdDivergences.length})</>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
