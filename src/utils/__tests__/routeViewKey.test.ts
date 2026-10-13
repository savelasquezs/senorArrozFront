import { describe, expect, it } from 'vitest'
import { getRouteViewKey } from '../routeViewKey'

describe('getRouteViewKey', () => {
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

    it('preserves previous remount rules for other routes', () => {
        expect(getRouteViewKey('/branches/2', '/branches/2?section=pos', 3))
            .not.toBe(getRouteViewKey('/branches/2', '/branches/2?section=payments', 3))
        expect(getRouteViewKey('/orders/8351', '/orders/8351?a=1', 3))
            .not.toBe(getRouteViewKey('/orders/8351', '/orders/8351?a=2', 3))
        expect(getRouteViewKey('/orders/new', '/orders/new', 3))
            .not.toBe(getRouteViewKey('/orders/new', '/orders/new', 4))
    })
})
