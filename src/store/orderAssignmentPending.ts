import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Order } from '@/types/order'

/** Only in-flight IDs, not order data or credentials. Survives modal remounts in the same app. */
export const useOrderAssignmentPendingStore = defineStore('orderAssignmentPending', () => {
    const orderIds = ref(new Set<number>())
    async function run(orderId: number, operation: () => Promise<Order>): Promise<Order | undefined> {
        if (orderIds.value.has(orderId)) return undefined
        orderIds.value.add(orderId)
        try { return await operation() }
        finally { orderIds.value.delete(orderId) }
    }
    return { orderIds, run }
})
