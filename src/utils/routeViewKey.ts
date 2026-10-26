export function getRouteViewKey(path: string, fullPath: string, branchRevision: number): string {
    const updatesInPlace = ['/orders', '/dashboard', '/customers', '/products', '/inventory', '/whatsapp'].includes(path)
        || /^\/branches\/\d+$/.test(path)
    return `${updatesInPlace ? path : fullPath}:${branchRevision}`
}
