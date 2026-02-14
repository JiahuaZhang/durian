import { useMemo } from 'react';
import { useIndicators } from './ChartContext';
import { MACDChart } from './plugin/macd/MACDChart';

export function AuxiliaryChart() {
    const { indicators } = useIndicators();

    const visibleIndicators = useMemo(() => Object.values(indicators).filter(i => i.visible), [indicators]);

    if (visibleIndicators.length === 0) return null;

    return (
        <div un-flex="~ col gap-2">
            {visibleIndicators.map(indicator => (
                indicator.type === 'macd' && <MACDChart key={indicator.id} id={indicator.id} />
            ))}
        </div>
    );
}
