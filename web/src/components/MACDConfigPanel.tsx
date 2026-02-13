import { MACDConfig, useIndicators } from '../contexts/ChartContext';

type NumberInputProps = {
    label: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
};

function NumberInput({ label, value, onChange, min = 1, max = 100 }: NumberInputProps) {
    return (
        <div un-flex="~ items-center justify-between" un-py="1">
            <label un-text="sm slate-600">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
                un-w="16"
                un-p="x-2 y-1"
                un-text="sm right"
                un-border="~ slate-300 rounded"
                un-bg="white"
                min={min}
                max={max}
            />
        </div>
    );
}

type ColorInputProps = {
    label: string;
    value: string;
    onChange: (val: string) => void;
};

function ColorInput({ label, value, onChange }: ColorInputProps) {
    return (
        <div un-flex="~ items-center justify-between" un-py="1">
            <label un-text="sm slate-600">{label}</label>
            <div un-flex="~ items-center gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    un-w="8"
                    un-h="6"
                    un-border="~ slate-300 rounded"
                    un-cursor="pointer"
                />
                <span un-text="xs slate-400 font-mono">{value}</span>
            </div>
        </div>
    );
}

// Helper hook to get a specific MACD indicator's config by id
function useMACDIndicatorConfig(id: string) {
    const { indicators, updateIndicatorConfig } = useIndicators();
    const macdIndicator = indicators[id];

    const config = macdIndicator?.config as MACDConfig | undefined;

    const updateConfig = (updates: Partial<MACDConfig>) => {
        updateIndicatorConfig(id, updates);
    };

    return { config, updateConfig };
}

type MACDPanelProps = {
    id: string;
};

export function MACDInputPanel({ id }: MACDPanelProps) {
    const { config, updateConfig } = useMACDIndicatorConfig(id);

    if (!config) return <div un-text="sm slate-400">No MACD indicator active</div>;

    const { fastPeriod, slowPeriod, signalPeriod } = config;

    return (
        <div un-flex="~ col gap-1" un-min-w="48">
            <NumberInput
                label="Fast Period"
                value={fastPeriod}
                onChange={val => updateConfig({ fastPeriod: val })}
                min={2}
                max={50}
            />
            <NumberInput
                label="Slow Period"
                value={slowPeriod}
                onChange={val => updateConfig({ slowPeriod: val })}
                min={2}
                max={100}
            />
            <NumberInput
                label="Signal Period"
                value={signalPeriod}
                onChange={val => updateConfig({ signalPeriod: val })}
                min={2}
                max={50}
            />
        </div>
    );
}

export function MACDStylePanel({ id }: MACDPanelProps) {
    const { config, updateConfig } = useMACDIndicatorConfig(id);

    if (!config) return <div un-text="sm slate-400">No MACD indicator active</div>;

    const { macdColor, signalColor, histogramUpColor, histogramDownColor } = config;

    return (
        <div un-flex="~ col gap-1" un-min-w="48">
            <ColorInput
                label="MACD Line"
                value={macdColor}
                onChange={val => updateConfig({ macdColor: val })}
            />
            <ColorInput
                label="Signal Line"
                value={signalColor}
                onChange={val => updateConfig({ signalColor: val })}
            />
            <ColorInput
                label="Histogram Up"
                value={histogramUpColor}
                onChange={val => updateConfig({ histogramUpColor: val })}
            />
            <ColorInput
                label="Histogram Down"
                value={histogramDownColor}
                onChange={val => updateConfig({ histogramDownColor: val })}
            />
        </div>
    );
}

type CheckboxInputProps = {
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
};

function CheckboxInput({ label, checked, onChange }: CheckboxInputProps) {
    return (
        <div un-flex="~ items-center justify-between" un-py="1">
            <label un-text="sm slate-600">{label}</label>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                un-w="4"
                un-h="4"
                un-cursor="pointer"
            />
        </div>
    );
}

export function MACDDivergencePanel({ id }: MACDPanelProps) {
    const { config, updateConfig } = useMACDIndicatorConfig(id);

    if (!config) return <div un-text="sm slate-400">No MACD indicator active</div>;

    const {
        showDivergences,
        divergenceBullColor,
        divergenceBearColor,
        pivotLookbackLeft,
        pivotLookbackRight,
        rangeMin,
        rangeMax,
        dontTouchZero,
    } = config;

    return (
        <div un-flex="~ col gap-1" un-min-w="48">
            <CheckboxInput
                label="Show Divergences"
                checked={showDivergences}
                onChange={val => updateConfig({ showDivergences: val })}
            />
            <CheckboxInput
                label="Don't Touch Zero"
                checked={dontTouchZero}
                onChange={val => updateConfig({ dontTouchZero: val })}
            />
            <NumberInput
                label="Lookback Left"
                value={pivotLookbackLeft}
                onChange={val => updateConfig({ pivotLookbackLeft: val })}
                min={1}
                max={20}
            />
            <NumberInput
                label="Lookback Right"
                value={pivotLookbackRight}
                onChange={val => updateConfig({ pivotLookbackRight: val })}
                min={1}
                max={20}
            />
            <NumberInput
                label="Range Min"
                value={rangeMin}
                onChange={val => updateConfig({ rangeMin: val })}
                min={1}
                max={100}
            />
            <NumberInput
                label="Range Max"
                value={rangeMax}
                onChange={val => updateConfig({ rangeMax: val })}
                min={10}
                max={200}
            />
            <ColorInput
                label="Bull Color"
                value={divergenceBullColor}
                onChange={val => updateConfig({ divergenceBullColor: val })}
            />
            <ColorInput
                label="Bear Color"
                value={divergenceBearColor}
                onChange={val => updateConfig({ divergenceBearColor: val })}
            />
        </div>
    );
}
