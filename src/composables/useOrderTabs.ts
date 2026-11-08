import { createOrderDraft } from '@/helpers/orderDraft'
// src/composables/useOrderTabs.ts
import { useOrderEditorStore as useOrdersDraftsStore } from '@/composables/useOrderEditor'
import type { DraftOrder, OrderType } from '@/types/order'

export function useOrderTabs() {
    const store = useOrdersDraftsStore()

    const createNewTab = () => {
        if (!store.canAddNewTab || !store.activeBranchId) return

        const tabId = `tab-${Date.now()}-${store.nextTabNumber}`
        const tabName = `Pedido ${store.nextTabNumber}`

        const newOrder = createOrderDraft(tabId, tabName, store.activeBranchId)

        store.draftOrders.set(tabId, newOrder)
        store.currentTabId = tabId
        store.nextTabNumber++
        store.saveToLocalStorage()
    }

    const switchTab = (tabId: string) => {
        const order = store.draftOrders.get(tabId)
        if (order && (order.workspaceBranchId ?? order.branchId) === store.activeBranchId) {
            store.currentTabId = tabId
            store.saveToLocalStorage()
            void store.loadOperationalContext(order.branchId)
        }
    }

    const closeTab = (tabId: string) => {
        if (store.draftOrders.has(tabId)) {
            store.draftOrders.delete(tabId)

            if (store.currentTabId === tabId) {
                const remainingTab = Array.from(store.draftOrders.values())
                    .find(order => (order.workspaceBranchId ?? order.branchId) === store.activeBranchId)
                store.currentTabId = remainingTab?.tabId ?? null
            }

            store.saveToLocalStorage()
        }
    }

    const renameTab = (tabId: string, newName: string) => {
        const order = store.draftOrders.get(tabId)
        if (order) {
            const updated = { ...order, tabName: newName, updatedAt: new Date() }
            store.draftOrders.set(tabId, updated)
            store.saveToLocalStorage()
        }
    }

    const updateOrderType = (type: OrderType) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        let deliveryFee = order.deliveryFee
        if (type === 'onsite') {
            deliveryFee = 0
        } else if (type === 'delivery') {
            deliveryFee = store.resolveDeliveryFeeFromSelectedAddress(order)
        }

        const updated = {
            ...order,
            type,
            deliveryFee,
            updatedAt: new Date(),
            ...(type === 'onsite' ? {
                freeDeliveryRequested: false,
                addressId: null,
                addressDescription: null,
                addressAdditionalInfo: null,
            } : {}),
        }
        store.draftOrders.set(store.currentTabId, updated)
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
    }

    return {
        createNewTab,
        switchTab,
        closeTab,
        renameTab,
        updateOrderType
    }
}

