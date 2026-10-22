import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { branchApi } from '@/services/MainAPI/branchApi'
import { useAuthStore } from '@/store/auth'
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
    const auth = useAuthStore()
    const maxFreeDeliveryDiscount = ref(DEFAULT_MAX_FREE_DELIVERY)
    const posCopyEtaMinMinutes = ref(DEFAULT_POS_COPY_ETA_MIN_MINUTES)
    const posCopyEtaRangeMinutes = ref(DEFAULT_POS_COPY_ETA_RANGE_MINUTES)
    const loadedBranchId = ref<number | null>(null)
    const isLoading = ref(false)
    let requestVersion = 0
    let loadedForOrderCreation: boolean | null = null
    let pending: { branchId: number; forOrderCreation: boolean; promise: Promise<void> } | null = null

    const posCopyMessageEtaPhrase = computed(() =>
        formatPosCopyEtaPhrase(posCopyEtaMinMinutes.value, posCopyEtaRangeMinutes.value),
    )

    function resetValues() {
        maxFreeDeliveryDiscount.value = DEFAULT_MAX_FREE_DELIVERY
        posCopyEtaMinMinutes.value = DEFAULT_POS_COPY_ETA_MIN_MINUTES
        posCopyEtaRangeMinutes.value = DEFAULT_POS_COPY_ETA_RANGE_MINUTES
        loadedBranchId.value = null
        loadedForOrderCreation = null
    }

    function clear() {
        requestVersion++
        pending = null
        isLoading.value = false
        resetValues()
    }

    // Logout, cambio de usuario/rol o sucursal de sesión invalidan también respuestas en vuelo.
    // Una renovación de token o actualización del perfil de la misma identidad no vacía la caché.
    watch(
        () => [auth.user?.id, auth.user?.role, auth.user?.branchId].join(':'),
        clear,
        { flush: 'sync' },
    )

    async function ensureForBranch(
        branchId: number | null | undefined,
        options?: { force?: boolean; forOrderCreation?: boolean },
    ): Promise<void> {
        if (branchId == null || !Number.isInteger(branchId) || branchId <= 0) {
            clear()
            return
        }
        const force = options?.force === true
        const forOrderCreation = options?.forOrderCreation === true
        if (!force && pending?.branchId === branchId && pending.forOrderCreation === forOrderCreation) {
            return pending.promise
        }
        if (!force && !pending && loadedBranchId.value === branchId
            && loadedForOrderCreation === forOrderCreation) return

        const version = ++requestVersion
        if (loadedBranchId.value !== branchId) resetValues()
        loadedBranchId.value = null
        loadedForOrderCreation = null
        isLoading.value = true
        const request = (async () => {
            try {
                const res = await branchApi.getBranchById(branchId, forOrderCreation)
                if (version !== requestVersion) return
                const v = res.data?.maxFreeDeliveryDiscount
                maxFreeDeliveryDiscount.value =
                    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : DEFAULT_MAX_FREE_DELIVERY
                const parsed = parseBranchPosCopyMinutes(res.data?.posCopyEtaMinMinutes, res.data?.posCopyEtaRangeMinutes)
                posCopyEtaMinMinutes.value = parsed.min
                posCopyEtaRangeMinutes.value = parsed.range
                loadedBranchId.value = branchId
                loadedForOrderCreation = forOrderCreation
            } catch {
                // Un error no cuenta como carga válida: el siguiente intento debe consultar la API.
                if (version === requestVersion) resetValues()
            } finally {
                if (version === requestVersion) isLoading.value = false
            }
        })()
        pending = { branchId, forOrderCreation, promise: request }
        try {
            await request
        } finally {
            // Una respuesta anterior no puede eliminar una solicitud más reciente.
            if (pending?.promise === request) pending = null
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
        clear,
    }
})
