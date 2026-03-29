// src/composables/useOrderPersistence.ts
import { onMounted, onUnmounted } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'

export function useOrderPersistence() {
    const ordersStore = useOrdersDraftsStore()
    const { createNewTab } = useOrderTabs()

    // Cargar datos al montar el componente
    onMounted(async () => {
        if (ordersStore.draftOrders.size === 0) {
            ordersStore.loadFromLocalStorage()

            if (ordersStore.draftOrders.size === 0) {
                createNewTab()
            } else {
                await ordersStore.rehydrateCustomersFromDrafts()
            }
        }
    })

    // Limpiar datos al desmontar (opcional)
    onUnmounted(() => {
        // No limpiar automáticamente, mantener persistencia
        // ordersStore.clearActiveOrders()
    })

    return {
        ordersStore
    }
}
