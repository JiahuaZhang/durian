import { useIndicators, useOverlays } from '@/contexts/ChartContext';
import { MACDTechnicalSignals } from './MACDTechnicalSignals';
import { MovingAverageSignal } from './MovingAverageSignal';

export function TechnicalSignals() {
    const { indicators } = useIndicators();
    const { overlays } = useOverlays();

    const macdIndicators = indicators.filter(i => i.type === 'macd');
    const maOverlays = overlays.filter(o => (o.type === 'sma' || o.type === 'ema') && o.visible);

    return (
        <div un-min-w="xs" un-shrink="0" un-max-h="xl" un-border="~ slate-200 rounded-lg" un-bg="slate-50" un-p="3" un-flex="~ col gap-3" un-overflow="y-auto">
            {maOverlays.map(overlay => (
                <MovingAverageSignal key={overlay.id} overlay={overlay} />
            ))}
            {macdIndicators.map(indicator => (
                <MACDTechnicalSignals key={indicator.id} indicator={indicator} />
            ))}
        </div>
    );
}
