import { createFileRoute } from '@tanstack/react-router';
import { MAChart } from '../components/MAChart';
import { fromYahooData } from '../data/yahoo';

const searchSchema = {
    symbol: (val: unknown) => typeof val === 'string' ? val : '^SPX',
    interval: (val: unknown) => typeof val === 'string' ? val : '1d',
}

type ParsedSearch = {
    symbol: string
    interval: string
}

export const Route = createFileRoute('/futures/ma')({
    component: RouteComponent,
    validateSearch: (search: Record<string, unknown>): ParsedSearch => {
        return {
            symbol: searchSchema.symbol(search.symbol),
            interval: searchSchema.interval(search.interval),
        }
    },
    loaderDeps: ({ search: { symbol, interval } }) => ({ symbol, interval }),
    loader: async ({ deps: { symbol, interval } }) => {
        const baseUrl = typeof window === 'undefined' ? 'http://localhost:3000' : '';
        const range = interval.endsWith('m') || interval.endsWith('h') ? '6mo' : '5y';
        const response = await fetch(`${baseUrl}/api/yahoo/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);

        const json = await response.json();
        const data = fromYahooData(json);

        return { data, symbol };
    }
})

function RouteComponent() {
    const { data, symbol } = Route.useLoaderData();

    return (
        <div un-h="full" un-w="full" un-p="4">
            <MAChart data={data} title={symbol} />
        </div>
    )
}
