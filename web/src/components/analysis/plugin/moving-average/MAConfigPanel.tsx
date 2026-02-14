import { MAMeta, type MAConfig } from './ma';

// ── Generic field renderer ───────────────────────────────────────────────

type FieldRendererProps = {
    field: (typeof MAMeta)[number];
    value: MAConfig[keyof MAConfig];
    onUpdate: (updates: Partial<MAConfig>) => void;
};

function MetaFieldRenderer({ field, value, onUpdate }: FieldRendererProps) {
    const update = (v: MAConfig[keyof MAConfig]) => onUpdate({ [field.key]: v } as Partial<MAConfig>);

    switch (field.type) {
        case 'number':
            return (
                <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={value as number}
                    onChange={(e) => {
                        let v = parseInt(e.target.value) || (field.min ?? 0);
                        if (field.min !== undefined) v = Math.max(field.min, v);
                        if (field.max !== undefined) v = Math.min(field.max, v);
                        update(v);
                    }}
                    un-w="20"
                    un-p="x-2 y-1"
                    un-text="sm right"
                    un-border="~ slate-200 rounded"
                />
            );
        case 'color':
            return (
                <input
                    type="color"
                    value={value as string}
                    onChange={(e) => update(e.target.value)}
                    un-w="8"
                    un-h="8"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                />
            );
        case 'boolean':
            return (
                <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => update(e.target.checked)}
                    un-w="4"
                    un-h="4"
                    un-cursor="pointer"
                />
            );
        case 'select':
            return (
                <select
                    value={value as number}
                    onChange={(e) => update(parseInt(e.target.value))}
                    un-p="x-2 y-1"
                    un-text="sm"
                    un-border="~ slate-200 rounded"
                    un-cursor="pointer"
                >
                    {field.options?.map(opt => (
                        <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
    }
}

// ── Group panel (renders all fields in a meta group) ─────────────────────

type MAConfigGroupPanelProps = {
    group: 'Inputs' | 'Style';
    config: MAConfig;
    onUpdate: (updates: Partial<MAConfig>) => void;
};

function MAConfigGroupPanel({ group, config, onUpdate }: MAConfigGroupPanelProps) {
    const fields = MAMeta.filter(f => f.group === group);
    return (
        <div un-flex="~ col gap-3">
            {fields.map(field => (
                <div key={field.key} un-flex="~ items-center justify-between">
                    <label un-text="sm slate-600">{field.label}</label>
                    <MetaFieldRenderer field={field} value={config[field.key as keyof MAConfig]} onUpdate={onUpdate} />
                </div>
            ))}
        </div>
    );
}

// ── Public API (keeps same names for consumers) ──────────────────────────

type MAPanelProps = {
    config: MAConfig;
    onUpdate: (updates: Partial<MAConfig>) => void;
};

export function MAInputsPanel({ config, onUpdate }: MAPanelProps) {
    return <MAConfigGroupPanel group="Inputs" config={config} onUpdate={onUpdate} />;
}

export function MAStylePanel({ config, onUpdate }: MAPanelProps) {
    return <MAConfigGroupPanel group="Style" config={config} onUpdate={onUpdate} />;
}
