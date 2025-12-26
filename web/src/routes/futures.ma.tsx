import { createFileRoute } from '@tanstack/react-router';
import { Time } from 'lightweight-charts';
import { CandleData, MAChart } from '../components/MAChart';

export const Route = createFileRoute('/futures/ma')({
    component: RouteComponent,
})

function generateData(numberOfCandles = 500): CandleData[] {
    let date = new Date();
    date.setDate(date.getDate() - numberOfCandles);

    let value = 4000;
    const data: CandleData[] = [];

    for (let i = 0; i < numberOfCandles; i++) {
        date.setDate(date.getDate() + 1);
        const dayStr = date.toISOString().split('T')[0];

        const change = (Math.random() - 0.5) * 40;
        const open = value + (Math.random() - 0.5) * 10;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 10;
        const low = Math.min(open, close) - Math.random() * 10;

        value = close;

        data.push({
            time: dayStr as Time,
            open,
            high,
            low,
            close,
        });
    }
    return data;
}

function RouteComponent() {
    const candleData = generateData(800);

    return (
        <div un-h="full" un-w="full" un-p="4">
            <MAChart data={candleData} title="SPX" />
        </div>
    )
}
