import type { ReactNode } from 'react';
import { ChartConfigProvider } from './ChartConfigContext';
import { type CandleData, CandleDataProvider } from './ChartDataContext';
import { LegendProvider } from './LegendContext';
import { MainChartProvider } from './MainChartContext';
import { OverlayDataProvider } from './OverlayDataContext';

// Re-export types from sub-contexts
export { useChartConfig, useIndicators, useOverlayConfigs } from './ChartConfigContext';
export type { EMAConfig, IndicatorType, MACDConfig, OverlayIndicator, OverlayType, RSIConfig, SMAConfig, SubIndicator, VolumeConfig } from './ChartConfigContext';
export { useCandleData } from './ChartDataContext';
export type { CandleData } from './ChartDataContext';
export { useLegend } from './LegendContext';
export type { EMALegend, MainLegend, OverlayLegend, SMALegend, VolumeLegend } from './LegendContext';
export { useMainChart } from './MainChartContext';
export { useOverlayData } from './OverlayDataContext';

// ============================================================================
// Composed Provider — 5 layers nested in dependency order
// ============================================================================

type ChartProviderProps = {
    children: ReactNode;
    initialData?: CandleData[];
};

export function ChartProvider({ children, initialData = [] }: ChartProviderProps) {
    return (
        <CandleDataProvider initialData={initialData}>
            <MainChartProvider>
                <ChartConfigProvider>
                    <OverlayDataProvider>
                        <LegendProvider>
                            {children}
                        </LegendProvider>
                    </OverlayDataProvider>
                </ChartConfigProvider>
            </MainChartProvider>
        </CandleDataProvider>
    );
}
