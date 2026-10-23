import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import { useOrderManagementUpdates } from './useOrderManagementUpdates'
import { orderApi } from '@/services/MainAPI/orderApi'
import { isOrderMutationPending, type OrderMutationSnapshot } from '@/services/MainAPI/orderMutation'

export function useOrderSnapshotUpdates(order: Ref<OrderMutationSnapshot | null>) {
    const latestVersion = ref(0)
    const conflictVersion = ref<number | null>(null)
    let generation = 0
    let pendingCheck: Promise<void> | undefined

    watch(() => order.value?.id, () => {
        generation++
        latestVersion.value = 0
        conflictVersion.value = null
        pendingCheck = undefined
    }, { flush: 'sync' })
    onUnmounted(() => { generation++ })

    const staleSnapshot = computed(() => {
        const snapshot = order.value
        if (!snapshot || isOrderMutationPending(snapshot.id)) return false
        const version = snapshot.managementVersion ?? 0
        return latestVersion.value > version || conflictVersion.value === version
    })

    function checkForChanges(): Promise<void> {
        if (pendingCheck) return pendingCheck
        const snapshot = order.value
        if (!snapshot) return Promise.resolve()
        const requestGeneration = generation
        const check = orderApi.fetchDetail(snapshot.id).then(latest => {
            if (requestGeneration !== generation || latest.id !== order.value?.id) return
            latestVersion.value = Math.max(latestVersion.value, latest.managementVersion ?? 0)
        }).catch(() => {
            // Un fallo de red no confirma un cambio; el API sigue validando la versión al guardar.
        }).finally(() => {
            if (pendingCheck === check) pendingCheck = undefined
        })
        pendingCheck = check
        return check
    }

    useOrderManagementUpdates(
        event => {
            if (event.orderId === order.value?.id) {
                latestVersion.value = Math.max(latestVersion.value, event.managementVersion)
            }
        },
        () => { void checkForChanges() },
        id => {
            if (id === order.value?.id) conflictVersion.value = order.value.managementVersion ?? 0
        },
    )

    function markRefreshed() {
        conflictVersion.value = null
    }

    return { staleSnapshot, checkForChanges, markRefreshed }
}
