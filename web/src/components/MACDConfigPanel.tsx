import { useChartConfig } from '../contexts/ChartConfigContext';

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

export function MACDInputPanel() {
    const { config, updateMACDConfig } = useChartConfig();
    const { fastPeriod, slowPeriod, signalPeriod } = config.macd;

    return (
        <div un-flex="~ col gap-1" un-min-w="48">
            <NumberInput
                label="Fast Period"
                value={fastPeriod}
                onChange={val => updateMACDConfig({ fastPeriod: val })}
                min={2}
                max={50}
            />
            <NumberInput
                label="Slow Period"
                value={slowPeriod}
                onChange={val => updateMACDConfig({ slowPeriod: val })}
                min={2}
                max={100}
            />
            <NumberInput
                label="Signal Period"
                value={signalPeriod}
                onChange={val => updateMACDConfig({ signalPeriod: val })}
                min={2}
                max={50}
            />
        </div>
    );
}

export function MACDStylePanel() {
    const { config, updateMACDConfig } = useChartConfig();
    const { macdColor, signalColor, histogramUpColor, histogramDownColor } = config.macd;

    return (
        <div un-flex="~ col gap-1" un-min-w="48">
            <ColorInput
                label="MACD Line"
                value={macdColor}
                onChange={val => updateMACDConfig({ macdColor: val })}
            />
            <ColorInput
                label="Signal Line"
                value={signalColor}
                onChange={val => updateMACDConfig({ signalColor: val })}
            />
            <ColorInput
                label="Histogram Up"
                value={histogramUpColor}
                onChange={val => updateMACDConfig({ histogramUpColor: val })}
            />
            <ColorInput
                label="Histogram Down"
                value={histogramDownColor}
                onChange={val => updateMACDConfig({ histogramDownColor: val })}
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

export function MACDDivergencePanel() {
    const { config, updateMACDConfig } = useChartConfig();
    const {
        showDivergences,
        divergenceBullColor,
        divergenceBearColor,
        pivotLookbackLeft,
        pivotLookbackRight,
        rangeMin,
        rangeMax,
        dontTouchZero,
    } = config.macd;

    return (
        <div un-flex="~ col gap-1" un-min-w="48">
            <CheckboxInput
                label="Show Divergences"
                checked={showDivergences}
                onChange={val => updateMACDConfig({ showDivergences: val })}
            />
            <CheckboxInput
                label="Don't Touch Zero"
                checked={dontTouchZero}
                onChange={val => updateMACDConfig({ dontTouchZero: val })}
            />
            <NumberInput
                label="Lookback Left"
                value={pivotLookbackLeft}
                onChange={val => updateMACDConfig({ pivotLookbackLeft: val })}
                min={1}
                max={20}
            />
            <NumberInput
                label="Lookback Right"
                value={pivotLookbackRight}
                onChange={val => updateMACDConfig({ pivotLookbackRight: val })}
                min={1}
                max={20}
            />
            <NumberInput
                label="Range Min"
                value={rangeMin}
                onChange={val => updateMACDConfig({ rangeMin: val })}
                min={1}
                max={100}
            />
            <NumberInput
                label="Range Max"
                value={rangeMax}
                onChange={val => updateMACDConfig({ rangeMax: val })}
                min={10}
                max={200}
            />
            <ColorInput
                label="Bull Color"
                value={divergenceBullColor}
                onChange={val => updateMACDConfig({ divergenceBullColor: val })}
            />
            <ColorInput
                label="Bear Color"
                value={divergenceBearColor}
                onChange={val => updateMACDConfig({ divergenceBearColor: val })}
            />
        </div>
    );
}

