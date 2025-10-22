// src/composables/useOrderPayments.ts
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import type { OrderAppPayment, OrderBankPayment } from '@/types/order'

export function useOrderPayments() {
    const store = useOrdersDraftsStore()

    const addAppPayment = (appId: number, amount: number) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        // Validation: Only 1 app payment per order
        if (order.appPayment !== null) {
            console.warn('Order already has an app payment')
            return
        }

        const app = store.apps.find(a => a.id === appId)
        if (!app) return

        const appPayment: OrderAppPayment = {
            tempId: `app-${Date.now()}`,
            appId: app.id,
            appName: app.name,
            bankId: app.bankId,
            bankName: app.bankName || '',
            amount
        }

        const updated = { ...order, appPayment }
        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    const updateAppPayment = (amount: number) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order || !order.appPayment) return

        const updated = {
            ...order,
            appPayment: {
                ...order.appPayment,
                amount,
                manuallyEdited: true  // Marcar como editado manualmente
            }
        }

        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    const removeAppPayment = () => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updated = { ...order, appPayment: null }
        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    const addBankPayment = (bankId: number, amount: number) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const bank = store.banks.find(b => b.id === bankId)
        if (!bank) return

        const bankPayment: OrderBankPayment = {
            tempId: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            bankId: bank.id,
            bankName: bank.name,
            amount
        }

        const updated = {
            ...order,
            bankPayments: [...order.bankPayments, bankPayment]
        }

        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    const updateBankPayment = (paymentTempId: string, amount: number) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updatedPayments = order.bankPayments.map(payment =>
            payment.tempId === paymentTempId
                ? { ...payment, amount, manuallyEdited: true }  // Marcar como editado manualmente
                : payment
        )

        const updated = {
            ...order,
            bankPayments: updatedPayments
        }

        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    const removeBankPayment = (paymentTempId: string) => {
        if (!store.currentTabId) return
        const order = store.draftOrders.get(store.currentTabId)
        if (!order) return

        const updated = {
            ...order,
            bankPayments: order.bankPayments.filter(p => p.tempId !== paymentTempId)
        }

        store.draftOrders.set(store.currentTabId, updated)
        store.saveToLocalStorage()
    }

    return {
        addAppPayment,
        updateAppPayment,
        removeAppPayment,
        addBankPayment,
        updateBankPayment,
        removeBankPayment
    }
}

