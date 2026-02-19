import { useMemo } from 'react';
import { useIndicators } from './context/ChartContext';
import { MACDChart } from './plugin/macd/MACDChart';
import { RSICharts } from './plugin/relative-strength-index/RSICharts';

export function AuxiliaryChart() {
    const { indicators } = useIndicators();

    const visibleIndicators = useMemo(() => Object.values(indicators).filter(i => i.visible), [indicators]);

    if (visibleIndicators.length === 0) return null;

    return (
        <div un-flex="~ col gap-2">
            {visibleIndicators.map(indicator => (
                indicator.type === 'macd' && <MACDChart key={indicator.id} id={indicator.id} />
            ))}
            <RSICharts />
        </div>
    );
}
