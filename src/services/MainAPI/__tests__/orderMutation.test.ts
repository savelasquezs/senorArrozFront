import { AxiosError, type AxiosAdapter } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseApi } from '../baseApi'
import { orderMutationConfig, ORDER_CONFLICT_EVENT, isOrderMutationPending } from '../orderMutation'
import { getSelectedBranchIdForRequest, setSelectedBranchIdForRequest } from '@/services/branchContextSession'
import { UserRole } from '@/types/auth'

class Probe extends BaseApi {
    save(snapshot: { id: number; managementVersion?: number }, adapter: AxiosAdapter) {
        return this.put('/orders/19', {}, { ...orderMutationConfig(snapshot), adapter })
    }
}
describe('order mutation snapshots', () => {
    beforeEach(() => {
        localStorage.setItem('user_data', JSON.stringify({ id: 7, role: UserRole.SUPERADMIN, branchId: 1 }))
        setSelectedBranchIdForRequest(1)
    })
    it('sends the editing version and keeps the source workspace for remote writes', async () => {
        const order = { id: 19, managementVersion: 3, branchId: 2 }
        await new Probe().save(order, async request => {
            expect(request.headers.get('X-Order-Id')).toBe('19')
            expect(request.headers.get('X-Order-Version')).toBe('3')
            expect(request.headers.get('X-Branch-Id')).toBe('1')
            expect(isOrderMutationPending(19)).toBe(true)
            return { status: 200, statusText: 'OK', config: request, data: {},
                headers: { 'x-order-id': '19', 'x-order-version': '5' } }
        })
        expect(order.managementVersion).toBe(5)
        expect(isOrderMutationPending(19)).toBe(false)
        expect(getSelectedBranchIdForRequest()).toBe(1)
    })
    it('does not silently replace a newer snapshot with a late response', async () => {
        const order = { id: 19, managementVersion: 3 }
        const config = orderMutationConfig(order)!
        order.managementVersion = 9
        config.onOrderVersion!(19, 5)
        expect(order.managementVersion).toBe(9)
    })
    it('ignores response headers for another order and missing versions', () => {
        const order = { id: 19, managementVersion: 3 }
        const config = orderMutationConfig(order)!
        config.onOrderVersion!(20, 10)
        config.onOrderVersion!(19, NaN)
        expect(order.managementVersion).toBe(3)
        expect(orderMutationConfig({ id: 19 })).toBeUndefined()
    })
    it.each([0, -1, NaN, 1.5])('rejects invalid version %s', version => {
        expect(() => orderMutationConfig({ id: 19, managementVersion: version })).toThrow('Actualiza')
    })
    it('keeps a conflicting draft version, reports the conflict and never retries it', async () => {
        const order = { id: 19, managementVersion: 3 }
        const listener = vi.fn()
        window.addEventListener(ORDER_CONFLICT_EVENT, listener)
        const adapter = vi.fn(async request => {
            throw new AxiosError('Conflict', 'ERR_BAD_REQUEST', request, {}, {
                status: 409, statusText: 'Conflict', config: request,
                data: { code: 'ORDER_VERSION_CONFLICT', message: 'El pedido cambió. Actualiza antes de guardar.' }, headers: {},
            })
        })
        try {
            await expect(new Probe().save(order, adapter)).rejects.toThrow('El pedido cambió')
            expect(adapter).toHaveBeenCalledTimes(1)
            expect(listener).toHaveBeenCalledTimes(1)
            expect((listener.mock.calls[0]![0] as CustomEvent).detail.orderId).toBe(19)
            expect(order.managementVersion).toBe(3)
            expect(isOrderMutationPending(19)).toBe(false)
        } finally { window.removeEventListener(ORDER_CONFLICT_EVENT, listener) }
    })

    it.each(['electronic_invoice_order_locked', 'EMPLOYEE_ON_LUNCH', 'BRANCH_SCOPE_MISMATCH', undefined])(
        'does not turn a business conflict (%s) into a stale order notice', async code => {
            const listener = vi.fn()
            window.addEventListener(ORDER_CONFLICT_EVENT, listener)
            try {
                await expect(new Probe().save({ id: 19, managementVersion: 3 }, async request => {
                    throw new AxiosError('Conflict', 'ERR_BAD_REQUEST', request, {}, {
                        status: 409, statusText: 'Conflict', config: request,
                        data: { code, message: 'Acción no permitida' }, headers: {},
                    })
                })).rejects.toThrow('Acción no permitida')
                expect(listener).not.toHaveBeenCalled()
                expect(isOrderMutationPending(19)).toBe(false)
            } finally { window.removeEventListener(ORDER_CONFLICT_EVENT, listener) }
        },
    )

    it('releases pending state on a network failure', async () => {
        await expect(new Probe().save({ id: 19, managementVersion: 3 }, async request => {
            expect(isOrderMutationPending(19)).toBe(true)
            throw new AxiosError('offline', 'ERR_NETWORK', request, {})
        })).rejects.toThrow('conectar')
        expect(isOrderMutationPending(19)).toBe(false)
    })
})
