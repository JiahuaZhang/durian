import type { EMAConfig } from '../../context/ChartContext';
import type { SMAConfig } from './ma';

// MA Inputs panel (period)
type MAInputsPanelProps = {
    config: SMAConfig | EMAConfig;
    onUpdate: (updates: Partial<SMAConfig | EMAConfig>) => void;
}

export function MAInputsPanel({ config, onUpdate }: MAInputsPanelProps) {
    return (
        <div un-flex="~ col gap-3">
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Period</label>
                <input
                    type="number"
                    min={1}
                    max={500}
                    value={config.period}
                    onChange={(e) => onUpdate({ period: Math.max(1, Math.min(500, parseInt(e.target.value) || 1)) })}
                    un-w="20"
                    un-p="x-2 y-1"
                    un-text="sm right"
                    un-border="~ slate-200 rounded"
                />
            </div>
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Show Cross Signals</label>
                <input
                    type="checkbox"
                    checked={config.showCrossSignals}
                    onChange={(e) => onUpdate({ showCrossSignals: e.target.checked })}
                    un-w="4"
                    un-h="4"
                    un-cursor="pointer"
                />
            </div>
        </div>
    )
}

// MA Style panel (color, lineWidth)
type MAStylePanelProps = {
    config: SMAConfig | EMAConfig;
    onUpdate: (updates: Partial<SMAConfig | EMAConfig>) => void;
}

export function MAStylePanel({ config, onUpdate }: MAStylePanelProps) {
    return (
        <div un-flex="~ col gap-3">
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Color</label>
                <input
                    type="color"
                    value={config.color}
                    onChange={(e) => onUpdate({ color: e.target.value })}
                    un-w="8"
                    un-h="8"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                />
            </div>
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Line Width</label>
                <select
                    value={config.lineWidth}
                    onChange={(e) => onUpdate({ lineWidth: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                    un-p="x-2 y-1"
                    un-text="sm"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                </select>
            </div>
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Bullish Color</label>
                <input
                    type="color"
                    value={config.bullishColor}
                    onChange={(e) => onUpdate({ bullishColor: e.target.value })}
                    un-w="8"
                    un-h="8"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                />
            </div>
            <div un-flex="~ items-center justify-between">
                <label un-text="sm slate-600">Bearish Color</label>
                <input
                    type="color"
                    value={config.bearishColor}
                    onChange={(e) => onUpdate({ bearishColor: e.target.value })}
                    un-w="8"
                    un-h="8"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                />
            </div>
        </div>
    )
}
