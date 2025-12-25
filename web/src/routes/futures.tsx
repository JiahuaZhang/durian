import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/futures')({
    component: FuturesLayout,
})

function FuturesLayout() {
    return (
        <>
            <Outlet />
        </>
    )
}
