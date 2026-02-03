import { createContext, useContext, useState, type ReactNode } from 'react';

// MACD Configuration
export type MACDConfig = {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    macdColor: string;
    signalColor: string;
    histogramUpColor: string;
    histogramDownColor: string;
};

const defaultMACDConfig: MACDConfig = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    macdColor: '#2962FF',
    signalColor: '#FF6D00',
    histogramUpColor: '#26a69a',
    histogramDownColor: '#ef5350',
};

// All chart configurations
export type ChartConfig = {
    macd: MACDConfig;
    // Future configs: volume, rsi, bollinger, etc.
};

type ChartConfigContextType = {
    config: ChartConfig;
    updateMACDConfig: (updates: Partial<MACDConfig>) => void;
    resetMACDConfig: () => void;
};

const ChartConfigContext = createContext<ChartConfigContextType | null>(null);

export function ChartConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<ChartConfig>({
        macd: defaultMACDConfig,
    });

    const updateMACDConfig = (updates: Partial<MACDConfig>) => {
        setConfig(prev => ({
            ...prev,
            macd: { ...prev.macd, ...updates },
        }));
    };

    const resetMACDConfig = () => {
        setConfig(prev => ({
            ...prev,
            macd: defaultMACDConfig,
        }));
    };

    return (
        <ChartConfigContext.Provider value={{ config, updateMACDConfig, resetMACDConfig }}>
            {children}
        </ChartConfigContext.Provider>
    );
}

export function useChartConfig() {
    const context = useContext(ChartConfigContext);
    if (!context) {
        throw new Error('useChartConfig must be used within a ChartConfigProvider');
    }
    return context;
}
