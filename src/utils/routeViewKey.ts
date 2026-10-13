/**
 * Reuse the orders view while changing only its query parameters
 * (notably remoteBranchId). Its tabs and URL are synchronized in-place.
 *
 * Before this, `route.fullPath` keyed <RouterView> and recreated OrdersList,
 * MainLayout and both SignalR hubs on every tab switch; each onMounted
 * dispatched a second complete set of orders/driver/options requests.
 *
 * Keep all unrelated routes' existing remount semantics, and preserve the
 * branch-context revision so changing the authenticated workspace resets data.
 */
export function getRouteViewKey(path: string, fullPath: string, branchRevision: number): string {
    if (path === '/orders') return `${path}:${branchRevision}`
    return path.startsWith('/branches/')
        ? fullPath
        : `${fullPath}:${branchRevision}`
}
