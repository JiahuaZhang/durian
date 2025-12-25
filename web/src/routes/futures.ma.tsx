import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/futures/ma')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/futures/ma"!</div>
}
