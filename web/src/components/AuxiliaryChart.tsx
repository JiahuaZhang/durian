import { useIndicators } from '../contexts/ChartContext';
import { MACDChart } from './MACDChart';

export function AuxiliaryChart() {
    const { indicators } = useIndicators();

    const visibleIndicators = indicators.filter(i => i.visible);

    if (visibleIndicators.length === 0) return null;

    return (
        <div un-flex="~ col gap-2">
            {visibleIndicators.map(indicator => (
                indicator.type === 'macd' && <MACDChart key={indicator.id} id={indicator.id} />
            ))}
        </div>
    );
}
