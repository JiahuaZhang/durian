// Alpha Vantage News & Sentiment API Service
// Free tier: 25 requests/day, 5 requests/minute

export type TickerSentiment = {
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
};

export type NewsItem = {
    title: string;
    url: string;
    time_published: string;
    authors: string[];
    summary: string;
    banner_image: string | null;
    source: string;
    category_within_source: string;
    source_domain: string;
    topics: { topic: string; relevance_score: string }[];
    overall_sentiment_score: number;
    overall_sentiment_label: string;
    ticker_sentiment: TickerSentiment[];
};

export type NewsResponse = {
    items: string;
    sentiment_score_definition: string;
    relevance_score_definition: string;
    feed: NewsItem[];
};

// Cache implementation with key based on filter params
const newsCache = new Map<string, { data: NewsResponse; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

// Use env variable for API key
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY ?? 'demo';

export type NewsFilter = {
    tickers?: string; // e.g., "AAPL,MSFT,NVDA"
    topics?: string; // e.g., "earnings,technology,finance"
    time_from?: string; // YYYYMMDDTHHMM format
    time_to?: string;
    sort?: 'LATEST' | 'EARLIEST' | 'RELEVANCE';
    limit?: number;
};

// Available topics from Alpha Vantage documentation
export const AVAILABLE_TOPICS = [
    { value: 'blockchain', label: 'Blockchain' },
    { value: 'earnings', label: 'Earnings' },
    { value: 'ipo', label: 'IPO' },
    { value: 'mergers_and_acquisitions', label: 'M&A' },
    { value: 'financial_markets', label: 'Markets' },
    { value: 'economy_fiscal', label: 'Fiscal Policy' },
    { value: 'economy_monetary', label: 'Monetary Policy' },
    { value: 'economy_macro', label: 'Macro' },
    { value: 'energy_transportation', label: 'Energy' },
    { value: 'finance', label: 'Finance' },
    { value: 'life_sciences', label: 'Life Sciences' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'retail_wholesale', label: 'Retail' },
    { value: 'technology', label: 'Technology' },
] as const;

// Default topics when none specified
export const DEFAULT_TOPICS = 'finance,technology';

function getCacheKey(filter?: NewsFilter): string {
    return JSON.stringify({
        tickers: filter?.tickers || '',
        topics: filter?.topics || DEFAULT_TOPICS,
        sort: filter?.sort || 'LATEST',
        limit: filter?.limit || 50,
    });
}

export async function fetchMarketNews(filter?: NewsFilter): Promise<NewsResponse> {
    const cacheKey = getCacheKey(filter);
    const now = Date.now();

    const cached = newsCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached news data for:', cacheKey);
        return cached.data;
    }

    const params = new URLSearchParams({
        function: 'NEWS_SENTIMENT',
        apikey: API_KEY,
        sort: filter?.sort || 'LATEST',
        limit: String(filter?.limit ?? 50),
    });

    // Apply topics - use default if none specified and no tickers
    const topics = filter?.topics || (!filter?.tickers ? DEFAULT_TOPICS : undefined);
    if (topics) params.set('topics', topics);
    if (filter?.tickers) params.set('tickers', filter.tickers);
    if (filter?.time_from) params.set('time_from', filter.time_from);
    if (filter?.time_to) params.set('time_to', filter.time_to);

    const url = `https://www.alphavantage.co/query?${params.toString()}`;
    console.log('Fetching news:', url.replace(API_KEY, '***'));

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.Note || data.Information) {
            console.warn('Alpha Vantage API limit:', data.Note || data.Information);
            if (cached) return cached.data;
            return { items: '0', sentiment_score_definition: '', relevance_score_definition: '', feed: [] };
        }

        newsCache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error('Failed to fetch news:', error);
        if (cached) return cached.data;
        throw error;
    }
}

export function getSentimentInfo(score: number): {
    label: string;
    color: string;
    bgColor: string;
    emoji: string;
} {
    if (score >= 0.35) {
        return { label: 'Bullish', color: 'emerald-600', bgColor: 'emerald-50', emoji: '📈' };
    }
    if (score >= 0.15) {
        return { label: 'Positive', color: 'green-600', bgColor: 'green-50', emoji: '↗️' };
    }
    if (score <= -0.35) {
        return { label: 'Bearish', color: 'red-600', bgColor: 'red-50', emoji: '📉' };
    }
    if (score <= -0.15) {
        return { label: 'Negative', color: 'orange-600', bgColor: 'orange-50', emoji: '↘️' };
    }
    return { label: 'Neutral', color: 'slate-500', bgColor: 'slate-50', emoji: '➡️' };
}

export function formatPublishedTime(timeStr: string): string {
    if (timeStr.length < 15) return timeStr;

    const year = timeStr.slice(0, 4);
    const month = timeStr.slice(4, 6);
    const day = timeStr.slice(6, 8);
    const hour = timeStr.slice(9, 11);
    const minute = timeStr.slice(11, 13);

    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const POPULAR_TICKERS = [
    { value: 'SPY', label: 'S&P 500' },
    { value: 'QQQ', label: 'NASDAQ 100' },
    { value: 'NVDA', label: 'Nvidia' },
    { value: 'AAPL', label: 'Apple' },
    { value: 'MSFT', label: 'Microsoft' },
    { value: 'GOOGL', label: 'Google' },
    { value: 'TSLA', label: 'Tesla' },
    { value: 'META', label: 'Meta' },
    { value: 'AMZN', label: 'Amazon' },
    { value: 'PLTR', label: 'Palantir' },
] as const;

export function getTopRelevantTickers(tickerSentiments: TickerSentiment[], limit = 3): TickerSentiment[] {
    return tickerSentiments
        .filter(t => parseFloat(t.relevance_score) > 0.1)
        .sort((a, b) => parseFloat(b.relevance_score) - parseFloat(a.relevance_score))
        .slice(0, limit);
}
