import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBranchContextStore } from '../branchContext'
import { getSelectedBranchIdForRequest } from '@/services/branchContextSession'
import { UserRole, type User } from '@/types/auth'

const { branchApiMock } = vi.hoisted(() => ({
    branchApiMock: {
        getBranchOptions: vi.fn(),
    },
}))

vi.mock('@/services/MainAPI/branchApi', () => ({
    branchApi: branchApiMock,
}))

const superadmin: User = {
    id: 9,
    name: 'Super',
    email: 'super@example.com',
    phone: '3000000000',
    active: true,
    role: UserRole.SUPERADMIN,
    branchId: 1,
    branchName: 'Santander',
}

describe('branch context store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        vi.clearAllMocks()
        branchApiMock.getBranchOptions.mockResolvedValue({
            data: [
                { id: 2, name: 'Bogotá' },
                { id: 1, name: 'Santander' },
            ],
        })
    })

    it('loads sorted options and falls back to the assigned branch', async () => {
        const store = useBranchContextStore()

        await store.initializeForUser(superadmin)

        expect(store.options.map(branch => branch.name)).toEqual(['Bogotá', 'Santander'])
        expect(store.selectedBranchId).toBe(1)
        expect(getSelectedBranchIdForRequest()).toBe(1)
    })

    it('restores the last valid branch stored per user', async () => {
        localStorage.setItem('senor-arroz:selected-branch:9', '2')
        const store = useBranchContextStore()

        await store.initializeForUser(superadmin)

        expect(store.selectedBranchId).toBe(2)
    })

    it('ignores a stored branch that no longer exists', async () => {
        localStorage.setItem('senor-arroz:selected-branch:9', '99')
        const store = useBranchContextStore()

        await store.initializeForUser(superadmin)

        expect(store.selectedBranchId).toBe(1)
    })

    it('persists selection and increments the revision used to invalidate views', async () => {
        const store = useBranchContextStore()
        await store.initializeForUser(superadmin)

        expect(store.selectBranch(superadmin, 2)).toBe(true)

        expect(store.selectedBranchId).toBe(2)
        expect(store.revision).toBe(1)
        expect(localStorage.getItem('senor-arroz:selected-branch:9')).toBe('2')
        expect(getSelectedBranchIdForRequest()).toBe(2)
    })

    it('uses only the JWT branch for non-superadmin users', async () => {
        const store = useBranchContextStore()
        const admin = { ...superadmin, role: UserRole.ADMIN, branchId: 7, branchName: 'Norte' }

        await store.initializeForUser(admin)

        expect(branchApiMock.getBranchOptions).not.toHaveBeenCalled()
        expect(store.selectedBranchId).toBe(7)
        expect(getSelectedBranchIdForRequest()).toBeNull()
    })
})
