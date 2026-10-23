import type { AxiosRequestConfig } from 'axios'
import { reactive } from 'vue'

/** The version belongs to the displayed/editing snapshot, never to a global latest-version cache. */
export interface OrderMutationSnapshot {
    id: number
    managementVersion?: number
}

export const ORDER_CONFLICT_EVENT = 'order-management-conflict'
const pendingMutations = reactive(new Map<number, number>())

export function isOrderMutationPending(orderId: number): boolean {
    return (pendingMutations.get(orderId) ?? 0) > 0
}

export function beginOrderMutation(orderId: number): (() => void) | undefined {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return undefined
    pendingMutations.set(orderId, (pendingMutations.get(orderId) ?? 0) + 1)
    let finished = false
    return () => {
        if (finished) return
        finished = true
        const remaining = (pendingMutations.get(orderId) ?? 1) - 1
        if (remaining > 0) pendingMutations.set(orderId, remaining)
        else pendingMutations.delete(orderId)
    }
}

export function orderMutationConfig(order?: OrderMutationSnapshot | null): AxiosRequestConfig | undefined {
    if (!order || order.managementVersion == null) return undefined
    const id = order.id
    const version = order.managementVersion
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(version) || version <= 0) {
        throw new Error('Actualiza el pedido antes de guardar los cambios.')
    }
    return {
        headers: { 'X-Order-Id': String(id), 'X-Order-Version': String(version) },
        // A callback survives Axios config cloning without cloning the Vue snapshot itself.
        onOrderVersion: (returnedId: number, nextVersion: number) => {
            if (returnedId === id && order.managementVersion === version
                && Number.isSafeInteger(nextVersion) && nextVersion > version) {
                order.managementVersion = nextVersion
            }
        },
    }
}

export function notifyOrderConflict(orderId: number): void {
    if (typeof window !== 'undefined' && Number.isSafeInteger(orderId) && orderId > 0) {
        window.dispatchEvent(new CustomEvent(ORDER_CONFLICT_EVENT, { detail: { orderId } }))
    }
}
