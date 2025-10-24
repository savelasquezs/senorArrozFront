import { ref, computed } from 'vue'
import type { CustomerAddress } from '@/types/customer'

/**
 * Composable para manejar la lógica de deliveryFee
 * Reutilizable entre OrderSidebar y EditCustomerModal
 */
export function useDeliveryFee(initialValue: number = 0) {
    const deliveryFee = ref<number>(initialValue)
    const manuallyEdited = ref<boolean>(false)

    /**
     * Auto-completa el deliveryFee con el valor de la dirección
     * Solo si el campo está vacío (0) y no ha sido editado manualmente
     */
    const autoCompleteFromAddress = (address: CustomerAddress | null) => {
        if (!address) return

        // Solo auto-completar si el campo está vacío y no ha sido editado manualmente
        if ((!deliveryFee.value || deliveryFee.value === 0) && !manuallyEdited.value) {
            deliveryFee.value = address.deliveryFee || 0
        }
    }

    /**
     * Marca el campo como editado manualmente
     * Esto previene futuras auto-completaciones
     */
    const markAsManuallyEdited = () => {
        manuallyEdited.value = true
    }

    /**
     * Resetea el estado de edición manual
     */
    const resetManualEdit = () => {
        manuallyEdited.value = false
    }

    /**
     * Establece un nuevo valor y marca como editado manualmente
     */
    const setValue = (value: number) => {
        deliveryFee.value = value
        markAsManuallyEdited()
    }

    /**
     * Indica si el valor actual es el sugerido por la dirección
     */
    const isSuggestedValue = computed(() => {
        return !manuallyEdited.value && deliveryFee.value > 0
    })

    return {
        deliveryFee,
        manuallyEdited,
        autoCompleteFromAddress,
        markAsManuallyEdited,
        resetManualEdit,
        setValue,
        isSuggestedValue
    }
}
