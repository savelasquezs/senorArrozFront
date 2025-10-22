// src/composables/useOrderPersistence.ts
import { onMounted, onUnmounted } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useOrderTabs } from '@/composables/useOrderTabs'

export function useOrderPersistence() {
    const ordersStore = useOrdersDraftsStore()
    const { createNewTab } = useOrderTabs()

    // Cargar datos al montar el componente
    onMounted(() => {
        // Solo cargar si no hay tabs activas (primera carga)
        if (ordersStore.draftOrders.size === 0) {
            ordersStore.loadFromLocalStorage()

            // Si no hay tabs después de cargar, crear una nueva
            if (ordersStore.draftOrders.size === 0) {
                createNewTab()
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
