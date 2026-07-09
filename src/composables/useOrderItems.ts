// src/composables/useOrderItems.ts
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'
import type { Product, OrderItem } from '@/types/order'

export function useOrderItems() {
    const store = useOrdersDraftsStore()
    const { createNewTab } = useOrderTabs()

    const lineSubtotal = (item: {
        quantity: number
        unitPrice: number
        discount: number
        dailyPromotionDiscount?: number | null
        freeDeliveryDiscount?: number | null
    }) => {
        const daily = Math.max(0, Number(item.dailyPromotionDiscount ?? 0) || 0)
        const fd = Math.max(0, Number(item.freeDeliveryDiscount ?? 0) || 0)
        return Math.max(0, item.quantity * item.unitPrice - item.discount - daily - fd)
    }

    const addProduct = (product: Product, quantity: number = 1) => {
        // Auto-crear tab si no existe
        if (!store.currentTabId) {
            createNewTab()
        }

        // Safety check
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const existingIndex = order.orderItems.findIndex(item => item.productId === product.id)

        let updatedItems: OrderItem[]

        if (existingIndex !== -1) {
            updatedItems = order.orderItems.map((item, index) => {
                if (index === existingIndex) {
                    const newQuantity = item.quantity + quantity
                    return { ...item, quantity: newQuantity, subtotal: lineSubtotal({ ...item, quantity: newQuantity }) }
                }
                return item
            })
        } else {
            const newItem: OrderItem = {
                tempId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                quantity,
                unitPrice: product.price,
                discount: 0,
                dailyPromotionDiscount: 0,
                dailyPromotionDiscountPercentage: null,
                freeDeliveryDiscount: 0,
                subtotal: product.price * quantity,
                notes: ''
            }
            updatedItems = [...order.orderItems, newItem]
        }

        const updated = { ...order, orderItems: updatedItems }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
        void store.applyDailyPromotionToCurrentOrder()
    }

    const removeItem = (itemTempId: string) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const removedItem = order.orderItems.find(item => item.tempId === itemTempId)
        const updated = {
            ...order,
            orderItems: order.orderItems.filter(item => item.tempId !== itemTempId),
            ignoredDailyPromotionId:
                removedItem?.isDailyPromotionGift === true && order.appliedDailyPromotionId
                    ? order.appliedDailyPromotionId
                    : order.ignoredDailyPromotionId,
            appliedDailyPromotionId:
                removedItem?.isDailyPromotionGift === true ? null : order.appliedDailyPromotionId,
        }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
    }

    const updateQuantity = (itemTempId: string, quantity: number) => {
        if (!store.currentTabId || quantity < 1) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedItems = order.orderItems.map(item => {
            if (item.tempId === itemTempId) {
                return { ...item, quantity, subtotal: lineSubtotal({ ...item, quantity }) }
            }
            return item
        })

        const updated = { ...order, orderItems: updatedItems }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
        void store.applyDailyPromotionToCurrentOrder()
    }

    const updatePrice = (itemTempId: string, price: number) => {
        if (!store.currentTabId || price < 0) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedItems = order.orderItems.map(item => {
            if (item.tempId === itemTempId) {
                return { ...item, unitPrice: price, subtotal: lineSubtotal({ ...item, unitPrice: price }) }
            }
            return item
        })

        const updated = { ...order, orderItems: updatedItems }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
        void store.applyDailyPromotionToCurrentOrder()
    }

    const updateDiscount = (itemTempId: string, discount: number) => {
        if (!store.currentTabId || discount < 0) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedItems = order.orderItems.map(item => {
            if (item.tempId === itemTempId) {
                return { ...item, discount, subtotal: lineSubtotal({ ...item, discount }) }
            }
            return item
        })

        const updated = { ...order, orderItems: updatedItems }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
    }

    const updateNotes = (itemTempId: string, notes: string) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedItems = order.orderItems.map(item =>
            item.tempId === itemTempId ? { ...item, notes } : item
        )

        const updated = { ...order, orderItems: updatedItems, updatedAt: new Date() }
        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    return {
        addProduct,
        removeItem,
        updateQuantity,
        updatePrice,
        updateDiscount,
        updateNotes
    }
}

