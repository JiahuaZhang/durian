import type { ReactNode } from 'react';
import { ChartConfigProvider } from './ChartConfigContext';
import { type CandleData, CandleDataProvider } from './ChartDataContext';
import { LegendProvider } from './LegendContext';

// Re-export types from sub-contexts for backward compatibility
export { useChartConfig, useIndicators, useMainChart, useOverlays } from './ChartConfigContext';
export type { EMAConfig, IndicatorType, MACDConfig, MainChartState, OverlayIndicator, OverlayType, RSIConfig, SMAConfig, SubIndicator, VolumeConfig } from './ChartConfigContext';
export { useCandleData } from './ChartDataContext';
export type { CandleData } from './ChartDataContext';
export { useLegend } from './LegendContext';
export type { EMALegend, MainLegend, OverlayLegend, SMALegend, VolumeLegend } from './LegendContext';

// ============================================================================
// Composed Provider
// ============================================================================

type ChartProviderProps = {
    children: ReactNode;
    initialData?: CandleData[];
};

export function ChartProvider({ children, initialData = [] }: ChartProviderProps) {
    return (
        <CandleDataProvider initialData={initialData}>
            <ChartConfigProvider>
                <LegendProvider>
                    {children}
                </LegendProvider>
            </ChartConfigProvider>
        </CandleDataProvider>
    );
}
