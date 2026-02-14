// ── Shared meta field types ──────────────────────────────────────────────

export type MetaFieldType = 'number' | 'color' | 'boolean' | 'select';

export type MetaField = {
    key: string;
    label: string;
    group: string;
    type: MetaFieldType;
    default: number | string | boolean;
    options?: readonly { value: number | string; label: string }[];
    min?: number;
    max?: number;
};

export type MetaTypeMap = { number: number; color: string; boolean: boolean; select: number };

// ── Generic config type derivation helper ────────────────────────────────
// Usage: type XConfig = DeriveConfig<typeof XMeta>;
export type DeriveConfig<M extends readonly MetaField[]> = {
    [F in M[number]as F['key']]: MetaTypeMap[F['type']];
};

// ── Generic default config from meta ─────────────────────────────────────
export function getDefaultConfig<M extends readonly MetaField[]>(meta: M): DeriveConfig<M> {
    return Object.fromEntries(meta.map(f => [f.key, f.default])) as DeriveConfig<M>;
}

// ── Generic field renderer ───────────────────────────────────────────────

type FieldRendererProps = {
    field: MetaField;
    value: string | number | boolean;
    onUpdate: (key: string, value: string | number | boolean) => void;
};

function MetaFieldRenderer({ field, value, onUpdate }: FieldRendererProps) {
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
                        onUpdate(field.key, v);
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
                    onChange={(e) => onUpdate(field.key, e.target.value)}
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
                    onChange={(e) => onUpdate(field.key, e.target.checked)}
                    un-w="4"
                    un-h="4"
                    un-cursor="pointer"
                />
            );
        case 'select':
            return (
                <select
                    value={value as number}
                    onChange={(e) => onUpdate(field.key, parseInt(e.target.value))}
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

// ── Generic group panel ──────────────────────────────────────────────────

type MetaGroupPanelProps = {
    meta: readonly MetaField[];
    group: string;
    config: Record<string, string | number | boolean>;
    onUpdate: (updates: Record<string, string | number | boolean>) => void;
};

export function MetaGroupPanel({ meta, group, config, onUpdate }: MetaGroupPanelProps) {
    const fields = meta.filter(f => f.group === group);
    return (
        <div un-flex="~ col gap-3">
            {fields.map(field => (
                <div key={field.key} un-flex="~ items-center justify-between">
                    <label un-text="sm slate-600">{field.label}</label>
                    <MetaFieldRenderer
                        field={field}
                        value={config[field.key]}
                        onUpdate={(key, val) => onUpdate({ [key]: val })}
                    />
                </div>
            ))}
        </div>
    );
}
