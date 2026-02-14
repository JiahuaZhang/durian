import { MetaGroupPanel } from '../meta';
import { VolumeMeta, type VolumeConfig } from './volume';

// ── Public API ───────────────────────────────────────────────────────────

type VolumeStylePanelProps = {
    config: VolumeConfig;
    onUpdate: (updates: Partial<VolumeConfig>) => void;
};

export function VolumeStylePanel({ config, onUpdate }: VolumeStylePanelProps) {
    return <MetaGroupPanel meta={VolumeMeta} group="Style" config={config} onUpdate={onUpdate} />;
}
