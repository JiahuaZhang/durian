import { useIndicators } from '../../context/ChartContext';
import { MetaGroupPanel } from '../meta';
import { RSIMeta, type RSIConfig } from './rsi';

function useRSIIndicatorConfig(id: string) {
    const { indicators, updateIndicatorConfig } = useIndicators();
    const rsiIndicator = indicators[id];
    const config = rsiIndicator?.config as RSIConfig | undefined;

    const updateConfig = (updates: Partial<RSIConfig>) => {
        updateIndicatorConfig(id, updates);
    };

    return { config, updateConfig };
}

type RSIPanelProps = {
    id: string;
};

export function RSIInputPanel({ id }: RSIPanelProps) {
    const { config, updateConfig } = useRSIIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No RSI indicator active</div>;

    return <MetaGroupPanel meta={RSIMeta} group="Inputs" config={config} onUpdate={updateConfig} />;
}

export function RSILevelPanel({ id }: RSIPanelProps) {
    const { config, updateConfig } = useRSIIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No RSI indicator active</div>;

    return <MetaGroupPanel meta={RSIMeta} group="Levels" config={config} onUpdate={updateConfig} />;
}

export function RSIStylePanel({ id }: RSIPanelProps) {
    const { config, updateConfig } = useRSIIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No RSI indicator active</div>;

    return <MetaGroupPanel meta={RSIMeta} group="Style" config={config} onUpdate={updateConfig} />;
}

export function RSISmoothingPanel({ id }: RSIPanelProps) {
    const { config, updateConfig } = useRSIIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No RSI indicator active</div>;

    return <MetaGroupPanel meta={RSIMeta} group="Smoothing" config={config} onUpdate={updateConfig} />;
}
