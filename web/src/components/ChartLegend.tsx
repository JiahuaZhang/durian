import { type EMAConfig, type EMALegend, type MainLegend, type OverlayIndicator, type SMAConfig, type SMALegend, type VolumeConfig, type VolumeLegend, useLegend, useOverlays } from "@/contexts/ChartContext";
import { useMemo } from "react";
import { Eye, EyeOff, Settings, X } from "lucide-react";
import { useRef, useState } from "react";
import { ChartConfigPopup } from "./ChartConfigPopup";

const formatPrice = (val: number) => val.toFixed(2)
const formatVol = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B'
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M'
    if (val >= 1e3) return (val / 1e3).toFixed(2) + 'K'
    return val.toString()
}
const getColor = (d: MainLegend) => d.close >= d.open ? '#26a69a' : '#ef5350'
export const UnoTrick = <div un-text="#26a69a #ef5350" />

const getOverlayLabel = (overlay: OverlayIndicator) => {
    switch (overlay.type) {
        case 'volume': return 'Vol';
        case 'sma': return `SMA(${(overlay.config as any).period})`;
        case 'ema': return `EMA(${(overlay.config as any).period})`;
        default: return overlay.type;
    }
}

// Get formatted value for overlay based on type
const getOverlayValueFromLegend = (type: string, legend: VolumeLegend | SMALegend | EMALegend | undefined): number | undefined => {
    if (!legend) return undefined;
    
    switch (type) {
        case 'volume':
            return (legend as VolumeLegend).volume;
        case 'sma':
        case 'ema':
            return (legend as SMALegend).value;
        default:
            return undefined;
    }
}

// Check if overlay is a moving average type
const isMAOverlay = (type: string) => type === 'sma' || type === 'ema';

type OverlayLegendItemProps = {
    overlay: OverlayIndicator;
    overlayLegend: VolumeLegend | SMALegend | EMALegend | undefined;
    color: string;
}

function OverlayLegendItem({ overlay, overlayLegend, color }: OverlayLegendItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const cogRef = useRef<HTMLButtonElement>(null);
    
    // Use context directly - no prop drilling
    const { toggleOverlay, removeOverlay, updateOverlayConfig } = useOverlays();
    
    const value = getOverlayValueFromLegend(overlay.type, overlayLegend);

    return (
        <div 
            un-flex="~ items-center gap-1" 
            un-opacity={overlay.visible ? '100' : '50'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span un-text="slate-500">{getOverlayLabel(overlay)}</span>
            {value !== undefined && overlay.visible && (
                <span un-text={color}>
                    {isMAOverlay(overlay.type) ? formatPrice(value) : formatVol(value)}
                </span>
            )}
            {isHovered && (
                <>
                    <button
                        ref={cogRef}
                        onClick={() => setConfigOpen(p => !p)}
                        un-cursor="pointer"
                        un-p="0.5"
                        un-hover:bg="slate-100"
                        un-border="rounded"
                        un-text="slate-400 hover:slate-600"
                    >
                        <Settings size={12} />
                    </button>
                    <button
                        onClick={() => toggleOverlay(overlay.id)}
                        un-cursor="pointer"
                        un-p="0.5"
                        un-hover:bg="slate-100"
                        un-border="rounded"
                        un-text="slate-400 hover:slate-600"
                    >
                        {overlay.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                        onClick={() => removeOverlay(overlay.id)}
                        un-cursor="pointer"
                        un-p="0.5"
                        un-hover:bg="red-100"
                        un-border="rounded"
                        un-text="slate-400 hover:red-500"
                    >
                        <X size={12} />
                    </button>
                </>
            )}
            
            {/* Config popup based on overlay type */}
            {overlay.type === 'volume' && (
                <ChartConfigPopup
                    title="Volume Settings"
                    isOpen={configOpen}
                    onClose={() => setConfigOpen(false)}
                    triggerRef={cogRef}
                    tabs={[
                        {
                            id: 'style',
                            label: 'Style',
                            content: (
                                <VolumeStylePanel
                                    config={overlay.config as VolumeConfig}
                                    onUpdate={(updates) => updateOverlayConfig(overlay.id, updates)}
                                />
                            )
                        }
                    ]}
                />
            )}
            {(overlay.type === 'sma' || overlay.type === 'ema') && (
                <ChartConfigPopup
                    title={overlay.type === 'sma' ? 'SMA Settings' : 'EMA Settings'}
                    isOpen={configOpen}
                    onClose={() => setConfigOpen(false)}
                    triggerRef={cogRef}
                    tabs={[
                        {
                            id: 'inputs',
                            label: 'Inputs',
                            content: (
                                <MAInputsPanel
                                    config={overlay.config as SMAConfig | EMAConfig}
                                    onUpdate={(updates) => updateOverlayConfig(overlay.id, updates)}
                                />
                            )
                        },
                        {
                            id: 'style',
                            label: 'Style',
                            content: (
                                <MAStylePanel
                                    config={overlay.config as SMAConfig | EMAConfig}
                                    onUpdate={(updates) => updateOverlayConfig(overlay.id, updates)}
                                />
                            )
                        },
                        {
                            id: 'signals',
                            label: 'Signals',
                            content: (
                                <MASignalsPanel
                                    config={overlay.config as SMAConfig | EMAConfig}
                                    onUpdate={(updates) => updateOverlayConfig(overlay.id, updates)}
                                />
                            )
                        }
                    ]}
                />
            )}
        </div>
    )
}

// Volume config panel
type VolumeStylePanelProps = {
    config: VolumeConfig;
    onUpdate: (updates: Partial<VolumeConfig>) => void;
}

function VolumeStylePanel({ config, onUpdate }: VolumeStylePanelProps) {
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

// MA Inputs panel (period)
type MAInputsPanelProps = {
    config: SMAConfig | EMAConfig;
    onUpdate: (updates: Partial<SMAConfig | EMAConfig>) => void;
}

function MAInputsPanel({ config, onUpdate }: MAInputsPanelProps) {
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
        </div>
    )
}

// MA Style panel (color, lineWidth)
type MAStylePanelProps = {
    config: SMAConfig | EMAConfig;
    onUpdate: (updates: Partial<SMAConfig | EMAConfig>) => void;
}

function MAStylePanel({ config, onUpdate }: MAStylePanelProps) {
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
        </div>
    )
}

// MA Signals panel (showCrossSignals)
type MASignalsPanelProps = {
    config: SMAConfig | EMAConfig;
    onUpdate: (updates: Partial<SMAConfig | EMAConfig>) => void;
}

function MASignalsPanel({ config, onUpdate }: MASignalsPanelProps) {
    return (
        <div un-flex="~ col gap-3" un-min-w="48">
            <div un-flex="~ items-center justify-between" un-py="1">
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

export function ChartLegend() {
    const { mainLegend: legend, overlayLegends } = useLegend();
    const { overlays: overlaysRecord } = useOverlays();
    const overlays = useMemo(() => Object.values(overlaysRecord), [overlaysRecord]);
    
    if (!legend && overlays.length === 0) return null;

    const color = legend ? getColor(legend) : '#26a69a'
    
    return (
        <>
            {legend && (
                <div
                    un-position="absolute top-1 left-2" 
                    un-z="10" 
                    un-text="xs" 
                    un-font="mono"
                    un-bg='white' 
                    un-shadow='sm' 
                    un-border='rounded' 
                    un-p='1'
                    un-pointer-events="none"
                >
                    <div un-flex="~ wrap gap-2">
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">O</span>
                            <span un-text={color}>{formatPrice(legend.open)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">H</span>
                            <span un-text={color}>{formatPrice(legend.high)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">L</span>
                            <span un-text={color}>{formatPrice(legend.low)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text="slate-500">C</span>
                            <span un-text={color}>{formatPrice(legend.close)}</span>
                        </div>
                        <div un-flex="~ gap-1">
                            <span un-text={legend.close >= legend.open ? 'green-500' : 'red-500'}>
                                {legend.close >= legend.open ? '↑' : '↓'} {(legend.close - legend.open).toFixed(2)} ({((legend.close - legend.open) / legend.open * 100).toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {overlays.length > 0 && (
                <div 
                    un-position="absolute left-2 top-8" 
                    un-z="10" 
                    un-text="xs" 
                    un-font="mono"
                    un-bg='white' 
                    un-shadow='sm' 
                    un-border='rounded' 
                    un-p='1'
                    un-pointer-events="auto"
                >
                    <div un-flex="~ col gap-1">
                        {overlays.map(overlay => (
                            <OverlayLegendItem
                                key={overlay.id}
                                overlay={overlay}
                                overlayLegend={overlayLegends[overlay.id]}
                                color={color}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
