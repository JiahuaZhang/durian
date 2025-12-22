import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/futures')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/futures"!</div>
}
