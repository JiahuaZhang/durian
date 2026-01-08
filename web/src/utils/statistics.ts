/**
 * Calculate the percentile rank of a value within a distribution.
 * Returns a value between 0 and 100.
 */
export function calculatePercentile(value: number, values: number[]): number {
    if (values.length === 0) return 50
    const sorted = [...values].sort((a, b) => a - b)
    const belowCount = sorted.filter(v => v < value).length
    const equalCount = sorted.filter(v => v === value).length
    return ((belowCount + 0.5 * equalCount) / sorted.length) * 100
}

/**
 * Normal probability density function.
 * Returns the height of the bell curve at point x.
 */
export function normalPdf(x: number, mean: number, stdDev: number): number {
    if (stdDev === 0) return x === mean ? 1 : 0
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2)
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
}

export type DistributionStats = {
    mean: number
    stdDev: number
    skewness: number
    kurtosis: number
    min: number
    max: number
    count: number
}

/**
 * Calculate all distribution statistics in a single efficient pass.
 * Avoids redundant mean/stdDev calculations.
 */
export function calculateDistributionStats(values: number[]): DistributionStats {
    const n = values.length
    if (n === 0) {
        return { mean: 0, stdDev: 0, skewness: 0, kurtosis: 0, min: 0, max: 0, count: 0 }
    }

    // Single pass for sum, min, max
    let sum = 0
    let min = values[0]
    let max = values[0]
    for (const v of values) {
        sum += v
        if (v < min) min = v
        if (v > max) max = v
    }
    const mean = sum / n

    if (n < 2) {
        return { mean, stdDev: 0, skewness: 0, kurtosis: 0, min, max, count: n }
    }

    // Second pass for variance, skewness, kurtosis
    let sumSquaredDiff = 0
    let sumCubedDiff = 0
    let sumFourthDiff = 0
    for (const v of values) {
        const diff = v - mean
        const diffSquared = diff * diff
        sumSquaredDiff += diffSquared
        sumCubedDiff += diffSquared * diff
        sumFourthDiff += diffSquared * diffSquared
    }

    const variance = sumSquaredDiff / n
    const stdDev = Math.sqrt(variance)

    let skewness = 0
    let kurtosis = 0

    if (stdDev !== 0 && n >= 3) {
        // Skewness: adjusted Fisher-Pearson
        const m3 = sumCubedDiff / n
        skewness = (n / ((n - 1) * (n - 2))) * (m3 / Math.pow(stdDev, 3)) * n
    }

    if (stdDev !== 0 && n >= 4) {
        // Excess kurtosis
        const m4 = sumFourthDiff / n
        kurtosis = (m4 / Math.pow(stdDev, 4)) - 3
    }

    return { mean, stdDev, skewness, kurtosis, min, max, count: n }
}
