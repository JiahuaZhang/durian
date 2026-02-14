import type { VolumeConfig } from '../../context/ChartContext';

type VolumeStylePanelProps = {
    config: VolumeConfig;
    onUpdate: (updates: Partial<VolumeConfig>) => void;
}

export function VolumeStylePanel({ config, onUpdate }: VolumeStylePanelProps) {
    return (
        <div un-flex="~ col gap-3">
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Up Color</label>
                <input
                    type="color"
                    value={config.upColor}
                    onChange={(e) => onUpdate({ upColor: e.target.value })}
                    un-w="8"
                    un-h="8"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                />
            </div>
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Down Color</label>
                <input
                    type="color"
                    value={config.downColor}
                    onChange={(e) => onUpdate({ downColor: e.target.value })}
                    un-w="8"
                    un-h="8"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                />
            </div>
        </div>
    )
}
