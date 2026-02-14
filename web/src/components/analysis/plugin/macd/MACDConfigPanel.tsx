import { useIndicators } from '../../context/ChartContext';
import { MetaGroupPanel } from '../meta';
import { MACDMeta, type MACDConfig } from './macd';

// ── Helper hook ──────────────────────────────────────────────────────────

function useMACDIndicatorConfig(id: string) {
    const { indicators, updateIndicatorConfig } = useIndicators();
    const macdIndicator = indicators[id];

    const config = macdIndicator?.config as MACDConfig | undefined;

    const updateConfig = (updates: Partial<MACDConfig>) => {
        updateIndicatorConfig(id, updates);
    };

    return { config, updateConfig };
}

// ── Public API ───────────────────────────────────────────────────────────

type MACDPanelProps = {
    id: string;
};

export function MACDInputPanel({ id }: MACDPanelProps) {
    const { config, updateConfig } = useMACDIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No MACD indicator active</div>;

    return <MetaGroupPanel meta={MACDMeta} group="Inputs" config={config} onUpdate={updateConfig} />;
}

export function MACDStylePanel({ id }: MACDPanelProps) {
    const { config, updateConfig } = useMACDIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No MACD indicator active</div>;

    return <MetaGroupPanel meta={MACDMeta} group="Style" config={config} onUpdate={updateConfig} />;
}

export function MACDDivergencePanel({ id }: MACDPanelProps) {
    const { config, updateConfig } = useMACDIndicatorConfig(id);
    if (!config) return <div un-text="sm slate-400">No MACD indicator active</div>;

    return <MetaGroupPanel meta={MACDMeta} group="Divergence" config={config} onUpdate={updateConfig} />;
}
