// src/composables/useOrderPersistence.ts
import { onMounted, onUnmounted } from 'vue'
import { useOrderEditorContext } from '@/composables/useOrderEditor'
import { useOrderEditorStore as useOrdersDraftsStore } from '@/composables/useOrderEditor'
import { useOrderTabs } from '@/composables/useOrderTabs'

export function useOrderPersistence() {
    const embedded = useOrderEditorContext()
    const ordersStore = useOrdersDraftsStore()
    const { createNewTab } = useOrderTabs()

    // Cargar datos al montar el componente
    onMounted(async () => {
        if (!embedded && ordersStore.draftOrders.size === 0) {
            ordersStore.loadFromLocalStorage()

            if (!embedded && ordersStore.draftOrders.size === 0) {
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
