import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderTabs } from '@/composables/useOrderTabs'
import { useOrdersDraftsStore } from '../ordersDrafts'
import { useBranchContextStore } from '../branchContext'
import { useAuthStore } from '../auth'
import { UserRole, type User } from '@/types/auth'
import { useBanksStore } from '../banks'
import { useAppsStore } from '../apps'

const { bankApiMock, appApiMock, branchApiMock } = vi.hoisted(() => ({
    bankApiMock: { getBanks: vi.fn() },
    appApiMock: { getApps: vi.fn() },
    branchApiMock: { getBranchById: vi.fn() },
}))

vi.mock('@/services/MainAPI/bankApi', () => ({ bankApi: bankApiMock }))
vi.mock('@/services/MainAPI/appApi', () => ({ appApi: appApiMock }))
vi.mock('@/services/MainAPI/branchApi', () => ({ branchApi: branchApiMock }))

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
        bankApiMock.getBanks.mockResolvedValue({ items: [], totalCount: 0 })
        appApiMock.getApps.mockResolvedValue({ items: [], totalCount: 0 })
        branchApiMock.getBranchById.mockResolvedValue({ data: { id: 3, maxFreeDeliveryDiscount: 3000 } })
        useBanksStore().clearList()
        useAppsStore().clearList()
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

    it('changes only the current draft branch, recalculates delivery and preserves the session', async () => {
        const context = useBranchContextStore()
        context.selectedBranchId = 1
        const drafts = useOrdersDraftsStore()
        const tabs = useOrderTabs()
        tabs.createNewTab()
        const firstTabId = drafts.currentTabId!
        tabs.createNewTab()
        const secondTabId = drafts.currentTabId!
        const current = drafts.draftOrders.get(secondTabId)!
        drafts.draftOrders.set(secondTabId, {
            ...current,
            customerId: 20,
            addressId: 10,
            deliveryFee: 7000,
            bankPayments: [{ tempId: 'bank', bankId: 1, bankName: 'Banco', amount: 1000 }],
            appPayment: { tempId: 'app', appId: 1, appName: 'App', bankId: 1, bankName: 'Banco', amount: 1000 },
            paidInStoreCash: true,
        })
        const selectedAddress = {
            id: 10,
            customerId: 20,
            neighborhoodId: 30,
            address: 'Calle 1',
            isPrimary: true,
            createdAt: '',
            updatedAt: '',
            deliveryFee: 7000,
            branchServices: [
                { branchId: 1, branchName: 'Santander', deliveryFee: 7000, isCovered: true },
                { branchId: 3, branchName: 'Bello', deliveryFee: 4500, isCovered: true },
            ],
        }
        drafts.ensureCustomerInList({
            id: 20,
            name: 'Cliente',
            branchId: 1,
            active: true,
            createdAt: '',
            updatedAt: '',
            addresses: [selectedAddress],
        })

        await drafts.changeOperationalBranch(3, selectedAddress)

        expect(drafts.draftOrders.get(firstTabId)?.branchId).toBe(1)
        expect(drafts.draftOrders.get(secondTabId)).toMatchObject({
            workspaceBranchId: 1,
            branchId: 3,
            deliveryFee: 4500,
            bankPayments: [],
            appPayment: null,
            paidInStoreCash: false,
        })
        expect(useAuthStore().branchId).toBe(7)
        expect(context.selectedBranchId).toBe(1)
        expect(bankApiMock.getBanks).toHaveBeenCalledWith(expect.objectContaining({ branchId: 3, forOrderCreation: true }))
        expect(appApiMock.getApps).toHaveBeenCalledWith(expect.objectContaining({ branchId: 3, forOrderCreation: true }))
    })

    it('persists and restores a cross-branch draft in its original workspace', () => {
        const context = useBranchContextStore()
        context.selectedBranchId = 1
        const drafts = useOrdersDraftsStore()
        const tabs = useOrderTabs()
        tabs.createNewTab()
        const tabId = drafts.currentTabId!
        drafts.draftOrders.set(tabId, { ...drafts.draftOrders.get(tabId)!, branchId: 3 })
        drafts.saveToLocalStorage()

        setActivePinia(createPinia())
        useAuthStore().user = user
        useBranchContextStore().selectedBranchId = 1
        const restored = useOrdersDraftsStore()
        restored.loadFromLocalStorage()

        expect(restored.currentTabId).toBe(tabId)
        expect(restored.currentOrder).toMatchObject({ workspaceBranchId: 1, branchId: 3 })
    })
})
