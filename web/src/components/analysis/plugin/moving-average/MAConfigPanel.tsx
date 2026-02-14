import { MetaGroupPanel } from '../meta';
import { MAMeta, type MAConfig } from './ma';

// ── Public API ───────────────────────────────────────────────────────────

type MAPanelProps = {
    config: MAConfig;
    onUpdate: (updates: Partial<MAConfig>) => void;
};

export function MAInputsPanel({ config, onUpdate }: MAPanelProps) {
    return <MetaGroupPanel meta={MAMeta} group="Inputs" config={config} onUpdate={onUpdate} />;
}

export function MAStylePanel({ config, onUpdate }: MAPanelProps) {
    return <MetaGroupPanel meta={MAMeta} group="Style" config={config} onUpdate={onUpdate} />;
}
