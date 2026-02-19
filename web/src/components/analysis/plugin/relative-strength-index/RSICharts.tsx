import { useMemo } from 'react';
import { useIndicators } from '../../context/ChartContext';
import { RSIChart } from './RSIChart';

export function RSICharts() {
    const { indicators } = useIndicators();
    const rsiIndicators = useMemo(
        () => Object.values(indicators).filter(i => i.type === 'rsi' && i.visible),
        [indicators]
    );

    if (rsiIndicators.length === 0) return null;

    return (
        <>
            {rsiIndicators.map(indicator => (
                <RSIChart key={indicator.id} id={indicator.id} />
            ))}
        </>
    );
}
