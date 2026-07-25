import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderTabs } from '@/composables/useOrderTabs'
import { useOrdersDraftsStore } from '../ordersDrafts'
import { useBranchContextStore } from '../branchContext'
import { useAuthStore } from '../auth'
import { UserRole, type User } from '@/types/auth'

const user: User = {
    id: 4,
    name: 'Admin',
    email: 'admin@example.com',
    phone: '3000000000',
    active: true,
    role: UserRole.ADMIN,
    branchId: 7,
    branchName: 'Santander',
}

describe('order drafts branch partition', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        useAuthStore().user = user
    })

    it('keeps drafts from other branches while showing only the active partition', () => {
        const context = useBranchContextStore()
        const drafts = useOrdersDraftsStore()
        const tabs = useOrderTabs()

        context.selectedBranchId = 1
        tabs.createNewTab()
        const firstTabId = drafts.currentTabId

        context.selectedBranchId = 2
        drafts.activateBranch(2)
        tabs.createNewTab()

        expect(drafts.draftOrders.size).toBe(2)
        expect(drafts.orderTabs).toHaveLength(1)
        expect(drafts.currentOrder?.branchId).toBe(2)

        context.selectedBranchId = 1
        drafts.activateBranch(1)
        expect(drafts.currentTabId).toBe(firstTabId)
        expect(drafts.currentOrder?.branchId).toBe(1)
    })

    it('migrates a legacy draft without branchId to the JWT-assigned branch', () => {
        const draft = {
            tabId: 'legacy-1',
            tabName: 'Pedido antiguo',
            type: 'delivery',
            orderItems: [],
            bankPayments: [],
            appPayment: null,
            subtotal: 0,
            total: 0,
            discountTotal: 0,
        }
        localStorage.setItem('senor-arroz-draft-orders', JSON.stringify({
            draftOrders: [draft],
            currentTabId: 'legacy-1',
            nextTabNumber: 2,
            lastSaved: new Date().toISOString(),
        }))

        const drafts = useOrdersDraftsStore()
        drafts.loadFromLocalStorage()

        expect(drafts.draftOrders.get('legacy-1')?.branchId).toBe(7)
        expect(drafts.currentOrder?.branchId).toBe(7)
    })
})
