// src/composables/useOrderTabs.ts
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { DraftOrder, OrderType } from '@/types/order'

export function useOrderTabs() {
    const store = useOrdersDraftsStore()

    const createNewTab = () => {
        if (store.draftOrders.size >= store.maxTabs) return

        const tabId = `tab-${Date.now()}-${store.nextTabNumber}`
        const tabName = `Pedido ${store.nextTabNumber}`

        const newOrder: DraftOrder = {
            tabId,
            tabName,
            branchId: null,
            source: null,
            whatsappConversationId: null,
            type: 'delivery',
            customerId: null,
            customerName: null,
            customerPhone: null,
            guestName: null,
            addressId: null,
            addressDescription: null,
            addressAdditionalInfo: null,
            deliveryFee: 0,
            freeDeliveryRequested: false,
            reservedFor: null,
            prepareAt: null,
            isLater: false,
            notes: '',
            orderItems: [],
            bankPayments: [],
            appPayment: null,
            subtotal: 0,
            total: 0,
            discountTotal: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            paidInStoreCash: false,
            selectedBenefitType: null,
            appliedBenefitType: null,
            appliedBenefitSourceId: null,
            appliedBenefitCode: null,
            appliedBenefitLabel: null,
            appliedBenefitRewardType: null,
            appliedBenefitAmount: null,
            appliedBenefitSnapshot: null,
            appliedDailyPromotionId: null,
            appliedDailyPromotionType: null,
            appliedDailyPromotionGiftProductId: null,
            appliedDailyPromotionGiftProductName: null,
            appliedDailyPromotionDiscountPercentage: null,
            appliedDailyPromotionDiscountScope: null,
            ignoredDailyPromotionId: null,
            appliedLoyaltyStepId: null,
            appliedLoyaltyStepIndex: null,
            appliedLoyaltyRewardType: null,
            appliedLoyaltyGiftProductId: null,
            appliedLoyaltyGiftProductName: null,
            appliedLoyaltyDiscountPercentage: null,
            ignoredLoyaltyStepId: null,
            discountCodeInput: '',
            activeDiscountCode: null,
            discountCodeError: null,
            appliedDiscountCodeId: null,
            appliedDiscountCodeCode: null,
            appliedDiscountCodeType: null,
            appliedDiscountCodeGiftProductId: null,
            appliedDiscountCodeGiftProductName: null,
            appliedDiscountCodeDiscountPercentage: null,
        }

        store.draftOrders.set(tabId, newOrder)
        store.currentTabId = tabId
        store.nextTabNumber++
        store.saveToLocalStorage()
    }

    const switchTab = (tabId: string) => {
        if (store.draftOrders.has(tabId)) {
            store.currentTabId = tabId
            store.saveToLocalStorage()
        }
    }

    const closeTab = (tabId: string) => {
        if (store.draftOrders.has(tabId)) {
            store.draftOrders.delete(tabId)

            if (store.currentTabId === tabId) {
                const remainingTabs = Array.from(store.draftOrders.keys())
                store.currentTabId = remainingTabs.length > 0 ? remainingTabs[0] : null
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
            ...(type === 'onsite' ? { freeDeliveryRequested: false } : {}),
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

