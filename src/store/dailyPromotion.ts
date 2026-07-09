import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { dailyPromotionApi } from '@/services/MainAPI/dailyPromotionApi'
import type { DailyPromotion, UpsertDailyPromotion } from '@/types/dailyPromotion'

const ACTIVE_TTL_MS = 60 * 1000

export const useDailyPromotionStore = defineStore('dailyPromotion', () => {
  const activeByBranch = ref<Record<number, DailyPromotion | null>>({})
  const currentByBranch = ref<Record<number, DailyPromotion | null>>({})
  const activeLoadedAt = ref<Record<number, number>>({})
  const activeInFlight = new Map<number, Promise<DailyPromotion | null>>()
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const hasActiveForBranch = computed(() => (branchId: number | null | undefined) => {
    if (!branchId) return false
    const promo = activeByBranch.value[branchId]
    return promo?.isActive === true && promo.status === 'active'
  })

  async function loadActive(branchId: number | null | undefined, force = false) {
    if (!branchId) return null
    const loadedAt = activeLoadedAt.value[branchId] ?? 0
    if (!force && Date.now() - loadedAt < ACTIVE_TTL_MS && branchId in activeByBranch.value) {
      return activeByBranch.value[branchId]
    }
    const existing = activeInFlight.get(branchId)
    if (existing) return existing

    const promise = (async () => {
      isLoading.value = true
      error.value = null
      try {
        const res = await dailyPromotionApi.getActive(branchId)
        activeByBranch.value = { ...activeByBranch.value, [branchId]: res.data ?? null }
        activeLoadedAt.value = { ...activeLoadedAt.value, [branchId]: Date.now() }
        return res.data ?? null
      } catch (err: any) {
        error.value = err?.message || 'No se pudo cargar la promo del dia'
        activeByBranch.value = { ...activeByBranch.value, [branchId]: null }
        activeLoadedAt.value = { ...activeLoadedAt.value, [branchId]: Date.now() }
        return null
      } finally {
        isLoading.value = false
        activeInFlight.delete(branchId)
      }
    })()

    activeInFlight.set(branchId, promise)
    return promise
  }

  async function loadCurrent(branchId: number | null | undefined) {
    if (!branchId) return null
    isLoading.value = true
    error.value = null
    try {
      const res = await dailyPromotionApi.getCurrent(branchId)
      currentByBranch.value = { ...currentByBranch.value, [branchId]: res.data ?? null }
      return res.data ?? null
    } catch (err: any) {
      error.value = err?.message || 'No se pudo cargar la configuracion de promo'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function save(branchId: number, payload: UpsertDailyPromotion) {
    isSaving.value = true
    error.value = null
    try {
      const res = await dailyPromotionApi.save(branchId, payload)
      currentByBranch.value = { ...currentByBranch.value, [branchId]: res.data ?? null }
      await loadActive(branchId, true)
      return res.data
    } catch (err: any) {
      error.value = err?.message || 'No se pudo guardar la promo del dia'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function disable(branchId: number) {
    isSaving.value = true
    error.value = null
    try {
      const res = await dailyPromotionApi.disable(branchId)
      currentByBranch.value = { ...currentByBranch.value, [branchId]: res.data ?? null }
      activeByBranch.value = { ...activeByBranch.value, [branchId]: null }
      activeLoadedAt.value = { ...activeLoadedAt.value, [branchId]: Date.now() }
      return res.data ?? null
    } catch (err: any) {
      error.value = err?.message || 'No se pudo desactivar la promo del dia'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  return {
    activeByBranch,
    currentByBranch,
    isLoading,
    isSaving,
    error,
    hasActiveForBranch,
    loadActive,
    loadCurrent,
    save,
    disable,
  }
})
