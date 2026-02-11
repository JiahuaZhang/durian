import { useIndicators } from '@/contexts/ChartContext';
import { MACDTechnicalSignals } from './MACDTechnicalSignals';

export function TechnicalSignals() {
    const { indicators } = useIndicators();

    const macdIndicators = indicators.filter(i => i.type === 'macd');

    return (
        <div un-min-w="xs" un-shrink="0" un-max-h="xl" un-border="~ slate-200 rounded-lg" un-bg="slate-50" un-p="3" un-flex="~ col gap-3" un-overflow="y-auto">
            {macdIndicators.map(indicator => (
                <MACDTechnicalSignals key={indicator.id} indicator={indicator} />
            ))}
        </div>
    );
}
