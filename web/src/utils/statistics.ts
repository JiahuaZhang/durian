
/**
 * Calculates the COT Index for a given value relative to a historical range.
 * Formula: (Current - Min) / (Max - Min) * 100
 * @param current The current value (or array of values ending with current)
 * @param history Array of historical values to determine Min/Max (should include current)
 * @returns number between 0 and 100
 */
export function calculateCotIndex(current: number, history: number[]): number {
    if (history.length === 0) return 0
    const min = Math.min(...history)
    const max = Math.max(...history)
    if (max === min) return 50 // No range
    return ((current - min) / (max - min)) * 100
}

/**
 * Calculates the Z-Score (Standard deviation score).
 * Formula: (Current - Mean) / StdDev
 * @param current The current value
 * @param history Array of historical values
 */
export function calculateZScore(current: number, history: number[]): number {
    if (history.length < 2) return 0
    const mean = history.reduce((a, b) => a + b, 0) / history.length
    const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length
    const stdDev = Math.sqrt(variance)
    if (stdDev === 0) return 0
    return (current - mean) / stdDev
}

export interface DivergenceResult {
    type: 'bearish' | 'bullish' | 'none'
    description?: string
}

/**
 * Detects basic divergence between Price and Indicator over a lookback window.
 * 
 * Bearish: Price makes New High, Indicator fails to make New High.
 * Bullish: Price makes New Low, Indicator fails to make New Low.
 * 
 * @param price Current price
 * @param priceHistory History of prices (lookback window)
 * @param indicator Current indicator value
 * @param indicatorHistory History of indicator (lookback window)
 */
export function detectDivergence(
    price: number,
    priceHistory: number[],
    indicator: number,
    indicatorHistory: number[]
): DivergenceResult {
    if (priceHistory.length === 0 || indicatorHistory.length === 0) return { type: 'none' }

    const priceMax = Math.max(...priceHistory)
    const priceMin = Math.min(...priceHistory)
    const indMax = Math.max(...indicatorHistory)
    const indMin = Math.min(...indicatorHistory)

    // Bearish Divergence Check
    // Price is at or near new high (within 1%)
    const priceIsHigh = price >= priceMax * 0.99
    // Indicator is SIGNIFICANTLY below its high (e.g., < 95% of range or just raw comparison)
    // Let's use raw: Current indicator is less than its max in the window
    const indFailedHigh = indicator < indMax

    if (priceIsHigh && indFailedHigh) {
        return { type: 'bearish', description: 'Price making highs, Positioning lagging (Smart Money Divergence)' }
    }

    // Bullish Divergence Check
    // Price is at or near new low (within 1%)
    const priceIsLow = price <= priceMin * 1.01
    // Indicator is ABOVE its low
    const indFailedLow = indicator > indMin

    if (priceIsLow && indFailedLow) {
        return { type: 'bullish', description: 'Price making lows, Positioning holding up (Accumulation)' }
    }

    return { type: 'none' }
}
