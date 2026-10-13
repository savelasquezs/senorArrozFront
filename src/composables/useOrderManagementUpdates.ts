import { onMounted, onUnmounted, watch } from 'vue'
import { useSignalR } from '@/composables/useSignalR'
import { useNetworkActivityManager } from '@/composables/useNetworkActivityManager'
import { ORDERS_SIGNALR_HUB_URL } from '@/config/signalr'
import { ORDER_CONFLICT_EVENT } from '@/services/MainAPI/orderMutation'

export interface OrderManagementChange {
    orderId: number
    branchId: number
    originBranchId?: number | null
    managementVersion: number
}

/** Subscribe to the user's existing workspace, NOT to the destination's broad branch group. */
export function useOrderManagementUpdates(
    changed: (event: OrderManagementChange) => void,
    refresh: () => void,
    conflict: (orderId: number) => void,
) {
    const { on, off, connectionState } = useSignalR(ORDERS_SIGNALR_HUB_URL)
    const { isPageVisible, isOnline } = useNetworkActivityManager()
    const handle = (event: OrderManagementChange) => {
        if (Number.isSafeInteger(event?.orderId) && Number.isSafeInteger(event?.managementVersion)) changed(event)
    }
    const onConflict = (event: Event) => conflict((event as CustomEvent<{ orderId: number }>).detail.orderId)
    onMounted(() => {
        on('OrderManagementChanged', handle)
        window.addEventListener(ORDER_CONFLICT_EVENT, onConflict)
    })
    onUnmounted(() => {
        off('OrderManagementChanged', handle)
        window.removeEventListener(ORDER_CONFLICT_EVENT, onConflict)
    })
    // La carga inicial ya la realiza la vista. No disparar otra consulta cuando
    // SignalR pasa de "connecting" a "connected" por primera vez.
    let hasConnectedOnce = connectionState.value === 'connected'
    watch(connectionState, (value) => {
        if (value !== 'connected') return
        if (hasConnectedOnce) refresh()
        hasConnectedOnce = true
    })
    watch([isPageVisible, isOnline], ([visible, online], [wasVisible, wasOnline]) => {
        if (visible && online && (!wasVisible || !wasOnline)) refresh()
    })
    return { isPageVisible, isOnline }
}
