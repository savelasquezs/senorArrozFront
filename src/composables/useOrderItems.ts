// src/composables/useOrderItems.ts
import { useOrdersStore } from '@/store/orders'
import type { Product, OrderItem } from '@/types/order'

export function useOrderItems() {
    const store = useOrdersStore()

    const addProduct = (product: Product, quantity: number = 1) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const existingIndex = order.orderItems.findIndex(item => item.productId === product.id)

        let updatedItems: OrderItem[]

        if (existingIndex !== -1) {
            updatedItems = order.orderItems.map((item, index) => {
                if (index === existingIndex) {
                    const newQuantity = item.quantity + quantity
                    const newSubtotal = (newQuantity * item.unitPrice) - item.discount
                    return { ...item, quantity: newQuantity, subtotal: newSubtotal }
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
                subtotal: product.price * quantity,
                notes: ''
            }
            updatedItems = [...order.orderItems, newItem]
        }

        const updated = { ...order, orderItems: updatedItems, updatedAt: new Date() }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
    }

    const removeItem = (itemTempId: string) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updated = {
            ...order,
            orderItems: order.orderItems.filter(item => item.tempId !== itemTempId),
            updatedAt: new Date()
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
                const newSubtotal = (quantity * item.unitPrice) - item.discount
                return { ...item, quantity, subtotal: newSubtotal }
            }
            return item
        })

        const updated = { ...order, orderItems: updatedItems, updatedAt: new Date() }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
    }

    const updatePrice = (itemTempId: string, price: number) => {
        if (!store.currentTabId || price < 0) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedItems = order.orderItems.map(item => {
            if (item.tempId === itemTempId) {
                const newSubtotal = (item.quantity * price) - item.discount
                return { ...item, unitPrice: price, subtotal: newSubtotal }
            }
            return item
        })

        const updated = { ...order, orderItems: updatedItems, updatedAt: new Date() }
        store.recalculateTotals(updated)
        store.saveToLocalStorage()
    }

    const updateDiscount = (itemTempId: string, discount: number) => {
        if (!store.currentTabId || discount < 0) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedItems = order.orderItems.map(item => {
            if (item.tempId === itemTempId) {
                const newSubtotal = (item.quantity * item.unitPrice) - discount
                return { ...item, discount, subtotal: newSubtotal }
            }
            return item
        })

        const updated = { ...order, orderItems: updatedItems, updatedAt: new Date() }
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

