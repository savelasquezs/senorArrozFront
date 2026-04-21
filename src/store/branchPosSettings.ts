import { defineStore } from 'pinia'
import { ref } from 'vue'
import { branchApi } from '@/services/MainAPI/branchApi'

const DEFAULT_MAX_FREE_DELIVERY = 3000

/**
 * Configuración POS por sucursal cargada desde API (tope domicilio gratis, etc.).
 */
export const useBranchPosSettingsStore = defineStore('branchPosSettings', () => {
    const maxFreeDeliveryDiscount = ref(DEFAULT_MAX_FREE_DELIVERY)
    const loadedBranchId = ref<number | null>(null)
    const isLoading = ref(false)

    async function ensureForBranch(branchId: number | null | undefined): Promise<void> {
        if (branchId == null || branchId <= 0) {
            maxFreeDeliveryDiscount.value = DEFAULT_MAX_FREE_DELIVERY
            loadedBranchId.value = null
            return
        }
        if (loadedBranchId.value === branchId && !isLoading.value) {
            return
        }
        isLoading.value = true
        try {
            const res = await branchApi.getBranchById(branchId)
            const v = res.data?.maxFreeDeliveryDiscount
            maxFreeDeliveryDiscount.value =
                typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : DEFAULT_MAX_FREE_DELIVERY
            loadedBranchId.value = branchId
        } catch {
            maxFreeDeliveryDiscount.value = DEFAULT_MAX_FREE_DELIVERY
            loadedBranchId.value = branchId
        } finally {
            isLoading.value = false
        }
    }

    return {
        maxFreeDeliveryDiscount,
        loadedBranchId,
        isLoading,
        ensureForBranch,
    }
})
