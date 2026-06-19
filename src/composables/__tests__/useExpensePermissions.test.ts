import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@/types/auth'
import { useExpensePermissions } from '@/composables/useExpensePermissions'

describe('useExpensePermissions', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-06-16T15:00:00.000Z'))
        setActivePinia(createPinia())
    })

    it('permite al cajero editar y eliminar gastos de hoy en America/Bogota', () => {
        const auth = useAuthStore()
        auth.user = {
            id: 1,
            name: 'Caja',
            email: 'caja@test.com',
            phone: '',
            active: true,
            role: UserRole.CASHIER,
            branchId: 1,
            branchName: 'Sucursal',
        }

        const { canEditExpense, canDeleteExpense } = useExpensePermissions()
        const expense = { createdAt: '2026-06-16T13:00:00.000Z' }

        expect(canEditExpense(expense)).toBe(true)
        expect(canDeleteExpense(expense)).toBe(true)
    })

    it('bloquea al cajero fuera de la fecha actual', () => {
        const auth = useAuthStore()
        auth.user = {
            id: 1,
            name: 'Caja',
            email: 'caja@test.com',
            phone: '',
            active: true,
            role: UserRole.CASHIER,
            branchId: 1,
            branchName: 'Sucursal',
        }

        const { canEditExpense, canDeleteExpense } = useExpensePermissions()
        const expense = { createdAt: '2026-06-15T23:00:00.000Z' }

        expect(canEditExpense(expense)).toBe(false)
        expect(canDeleteExpense(expense)).toBe(false)
    })

    it('mantiene permiso total para admin y superadmin', () => {
        const auth = useAuthStore()
        auth.user = {
            id: 1,
            name: 'Admin',
            email: 'admin@test.com',
            phone: '',
            active: true,
            role: UserRole.ADMIN,
            branchId: 1,
            branchName: 'Sucursal',
        }

        const permissions = useExpensePermissions()
        expect(permissions.canEditExpense({ createdAt: '2026-06-01T13:00:00.000Z' })).toBe(true)

        auth.user = {
            ...auth.user,
            role: UserRole.SUPERADMIN,
        }

        expect(permissions.canDeleteExpense({ createdAt: '2026-05-01T13:00:00.000Z' })).toBe(true)
    })
})
