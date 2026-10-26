import { describe, expect, it } from 'vitest'
import { getRouteViewKey } from '../routeViewKey'

describe('getRouteViewKey', () => {
    it('keeps dashboard filters and layout mounted on section changes but resets on workspace changes', () => {
        const key = getRouteViewKey('/dashboard', '/dashboard?section=domicilios', 3)
        expect(getRouteViewKey('/dashboard', '/dashboard?section=ventas', 3)).toBe(key)
        expect(getRouteViewKey('/dashboard', '/dashboard?section=domicilios', 4)).not.toBe(key)
    })

    it('does not remount OrdersList on remoteBranchId tab changes', () => {
        const local = getRouteViewKey('/orders', '/orders', 3)
        const remote = getRouteViewKey('/orders', '/orders?remoteBranchId=2', 3)
        const back = getRouteViewKey('/orders', '/orders?remoteBranchId=3', 3)
        expect(remote).toBe(local)
        expect(back).toBe(local)
    })

    it('remounts orders when the actual workspace branch changes', () => {
        expect(getRouteViewKey('/orders', '/orders?remoteBranchId=2', 4))
            .not.toBe(getRouteViewKey('/orders', '/orders?remoteBranchId=2', 5))
    })

    it('updates detail modals and sections in place', () => {
        expect(getRouteViewKey('/branches/2', '/branches/2?section=pos', 3))
            .toBe(getRouteViewKey('/branches/2', '/branches/2?section=payments', 3))
        for (const path of ['/customers', '/products', '/inventory', '/whatsapp']) {
            expect(getRouteViewKey(path, `${path}?detail=1`, 3))
                .toBe(getRouteViewKey(path, `${path}?detail=2`, 3))
        }
        expect(getRouteViewKey('/branches/2', '/branches/2', 3))
            .not.toBe(getRouteViewKey('/branches/3', '/branches/3', 3))
        expect(getRouteViewKey('/branches/2', '/branches/2', 3))
            .not.toBe(getRouteViewKey('/branches/2', '/branches/2', 4))
    })

    it('preserves other resource remount rules', () => {
        expect(getRouteViewKey('/orders/8351', '/orders/8351?a=1', 3))
            .not.toBe(getRouteViewKey('/orders/8351', '/orders/8351?a=2', 3))
        expect(getRouteViewKey('/orders/new', '/orders/new', 3))
            .not.toBe(getRouteViewKey('/orders/new', '/orders/new', 4))
    })
})
