import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderPermissions } from '@/composables/useOrderPermissions'
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@/types/auth'
import type { OrderListItem } from '@/types/order'

function baseOrder(overrides: Partial<OrderListItem> = {}): OrderListItem {
    return {
        id: 1,
        branchId: 1,
        branchName: 'B',
        takenById: 1,
        takenByName: 'T',
        customerId: null,
        customerName: null,
        customerPhone: null,
        addressId: null,
        addressDescription: null,
        neighborhoodId: null,
        neighborhoodName: null,
        deliveryManId: null,
        deliveryManName: null,
        guestName: 'G',
        type: 'reservation',
        typeDisplayName: 'Reserva',
        deliveryFee: null,
        reservedFor: '2026-04-15T23:00:00.000Z',
        prepareAt: null,
        status: 'taken',
        statusDisplayName: 'Tomado',
        statusTimes: {},
        subtotal: 0,
        total: 10000,
        discountTotal: 0,
        notes: null,
        cancelledReason: null,
        createdAt: '2026-04-10T12:00:00.000Z',
        updatedAt: '2026-04-10T12:00:00.000Z',
        bankPayments: [],
        appPayments: [],
        totalDeposited: 0,
        ...overrides,
    }
}

describe('useOrderPermissions — canEditPayments', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-15T15:00:00.000Z'))
        setActivePinia(createPinia())
        const auth = useAuthStore()
        auth.user = {
            id: 1,
            name: 'C',
            email: 'c@test.com',
            phone: '',
            active: true,
            role: UserRole.CASHIER,
            branchId: 1,
            branchName: 'B',
        }
    })

    it('permite editar pagos el día de prepareAt aunque createdAt sea anterior', () => {
        const { canEditPayments } = useOrderPermissions()
        const order = baseOrder({
            prepareAt: '2026-04-15T20:00:00.000Z',
        })
        expect(canEditPayments(order)).toBe(true)
    })

    it('no permite editar pagos si ni createdAt ni prepareAt caen en hoy (CO)', () => {
        const { canEditPayments } = useOrderPermissions()
        const order = baseOrder({
            prepareAt: '2026-04-14T20:00:00.000Z',
        })
        expect(canEditPayments(order)).toBe(false)
    })

    it('Superadmin siempre puede editar pagos', () => {
        const auth = useAuthStore()
        const u = auth.user
        if (!u) throw new Error('expected user')
        auth.user = { ...u, role: UserRole.SUPERADMIN }
        const { canEditPayments } = useOrderPermissions()
        const order = baseOrder({
            prepareAt: '2026-04-14T20:00:00.000Z',
        })
        expect(canEditPayments(order)).toBe(true)
    })
})

describe('useOrderPermissions — canCancel', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-15T15:00:00.000Z'))
        setActivePinia(createPinia())
        const auth = useAuthStore()
        auth.user = {
            id: 2,
            name: 'A',
            email: 'a@test.com',
            phone: '',
            active: true,
            role: UserRole.ADMIN,
            branchId: 1,
            branchName: 'B',
        }
    })

    it('reserva programada: Admin puede cancelar aunque no coincida con ninguna fecha del día', () => {
        const { canCancel } = useOrderPermissions()
        const order = baseOrder({
            createdAt: '2026-04-10T12:00:00.000Z',
            prepareAt: '2026-04-14T20:00:00.000Z',
            reservedFor: '2026-04-14T23:00:00.000Z',
        })
        expect(canCancel(order)).toBe(true)
    })

    it('reserva programada: Superadmin también puede cancelar en cualquier momento', () => {
        const auth = useAuthStore()
        const u = auth.user
        if (!u) throw new Error('expected user')
        auth.user = { ...u, role: UserRole.SUPERADMIN }

        const { canCancel } = useOrderPermissions()
        const order = baseOrder({
            createdAt: '2026-04-10T12:00:00.000Z',
            prepareAt: '2026-04-14T20:00:00.000Z',
            reservedFor: '2026-04-14T23:00:00.000Z',
        })
        expect(canCancel(order)).toBe(true)
    })

    it('Cajero no puede cancelar aunque sea el día programado', () => {
        const auth = useAuthStore()
        const u = auth.user
        if (!u) throw new Error('expected user')
        auth.user = { ...u, role: UserRole.CASHIER }
        const { canCancel } = useOrderPermissions()
        const order = baseOrder({
            prepareAt: '2026-04-15T20:00:00.000Z',
            reservedFor: '2026-04-15T23:00:00.000Z',
        })
        expect(canCancel(order)).toBe(false)
    })
})
