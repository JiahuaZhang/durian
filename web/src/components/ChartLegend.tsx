import { type MainLegend, type OverlayIndicator, type VolumeLegend, useMainChart, useOverlays } from "@/contexts/ChartContext";
import { Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";

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

type OverlayLegendItemProps = {
    overlay: OverlayIndicator;
    value?: number;
    color: string;
    onToggle?: (id: string) => void;
    onRemove?: (id: string) => void;
}

function OverlayLegendItem({ overlay, value, color, onToggle, onRemove }: OverlayLegendItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            un-flex="~ items-center gap-1" 
            un-opacity={overlay.visible ? '100' : '50'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span un-text="slate-500">{getOverlayLabel(overlay)}</span>
            {value !== undefined && overlay.visible && (
                <span un-text={color}>{formatVol(value)}</span>
            )}
            {isHovered && (
                <>
                    <button
                        onClick={() => onToggle?.(overlay.id)}
                        un-cursor="pointer"
                        un-p="0.5"
                        un-hover:bg="slate-100"
                        un-border="rounded"
                        un-text="slate-400 hover:slate-600"
                    >
                        {overlay.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                        onClick={() => onRemove?.(overlay.id)}
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
        </div>
    )
}

export function ChartLegend() {
    const { legend } = useMainChart();
    const { overlays, toggleOverlay, removeOverlay } = useOverlays();
    
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
                                value={overlay.type === 'volume' && overlay.legend ? (overlay.legend as VolumeLegend).volume : undefined}
                                color={color}
                                onToggle={toggleOverlay}
                                onRemove={removeOverlay}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
