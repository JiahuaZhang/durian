import { createFileRoute } from '@tanstack/react-router'
import { EconomicCalendar } from 'react-ts-tradingview-widgets'

export const Route = createFileRoute('/economic-calendar')({
    component: EconomicCalendarPage
})

function EconomicCalendarPage() {
    return (
        <div un-p="4" un-h="full" un-flex="~ col" un-gap="4">
            <h1 un-text="4xl transparent" un-font="bold" un-bg-gradient="to-r" un-from="purple-600" un-to="pink-600" un-bg="clip-text">
                Economic Calendar
            </h1>

            <div un-flex="1" un-bg="white" un-rounded="xl" un-border="~ slate-200" un-shadow="sm" un-overflow="hidden" un-w='150'>
                <EconomicCalendar
                    width="100%"
                    height="100%"
                    countryFilter="us"
                />
            </div>
        </div>
    )
}
