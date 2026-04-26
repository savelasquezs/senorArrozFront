import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { branchApi } from '@/services/MainAPI/branchApi'
import {
    DEFAULT_POS_COPY_ETA_MIN_MINUTES,
    DEFAULT_POS_COPY_ETA_RANGE_MINUTES,
    formatPosCopyEtaPhrase,
    parseBranchPosCopyMinutes,
} from '@/composables/usePosCopyEta'

const DEFAULT_MAX_FREE_DELIVERY = 3000

/**
 * Configuración POS por sucursal cargada desde API (tope domicilio gratis, ventana ETA copiable, etc.).
 */
export const useBranchPosSettingsStore = defineStore('branchPosSettings', () => {
    const maxFreeDeliveryDiscount = ref(DEFAULT_MAX_FREE_DELIVERY)
    const posCopyEtaMinMinutes = ref(DEFAULT_POS_COPY_ETA_MIN_MINUTES)
    const posCopyEtaRangeMinutes = ref(DEFAULT_POS_COPY_ETA_RANGE_MINUTES)
    const loadedBranchId = ref<number | null>(null)
    const isLoading = ref(false)

    const posCopyMessageEtaPhrase = computed(() =>
        formatPosCopyEtaPhrase(posCopyEtaMinMinutes.value, posCopyEtaRangeMinutes.value),
    )

    async function ensureForBranch(
        branchId: number | null | undefined,
        options?: { force?: boolean },
    ): Promise<void> {
        if (branchId == null || branchId <= 0) {
            maxFreeDeliveryDiscount.value = DEFAULT_MAX_FREE_DELIVERY
            posCopyEtaMinMinutes.value = DEFAULT_POS_COPY_ETA_MIN_MINUTES
            posCopyEtaRangeMinutes.value = DEFAULT_POS_COPY_ETA_RANGE_MINUTES
            loadedBranchId.value = null
            return
        }
        const force = options?.force === true
        if (!force && loadedBranchId.value === branchId && !isLoading.value) {
            return
        }
        if (force) {
            loadedBranchId.value = null
        }
        isLoading.value = true
        try {
            const res = await branchApi.getBranchById(branchId)
            const v = res.data?.maxFreeDeliveryDiscount
            maxFreeDeliveryDiscount.value =
                typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : DEFAULT_MAX_FREE_DELIVERY
            const parsed = parseBranchPosCopyMinutes(res.data?.posCopyEtaMinMinutes, res.data?.posCopyEtaRangeMinutes)
            posCopyEtaMinMinutes.value = parsed.min
            posCopyEtaRangeMinutes.value = parsed.range
            loadedBranchId.value = branchId
        } catch {
            maxFreeDeliveryDiscount.value = DEFAULT_MAX_FREE_DELIVERY
            posCopyEtaMinMinutes.value = DEFAULT_POS_COPY_ETA_MIN_MINUTES
            posCopyEtaRangeMinutes.value = DEFAULT_POS_COPY_ETA_RANGE_MINUTES
            loadedBranchId.value = branchId
        } finally {
            isLoading.value = false
        }
    }

    return {
        maxFreeDeliveryDiscount,
        posCopyEtaMinMinutes,
        posCopyEtaRangeMinutes,
        posCopyMessageEtaPhrase,
        loadedBranchId,
        isLoading,
        ensureForBranch,
    }
})
