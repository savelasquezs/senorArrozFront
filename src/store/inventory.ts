import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { inventoryApi } from '@/services/MainAPI/inventoryApi'
import type { InventoryBalance, InventoryCount, InventoryDeviationPoint, InventoryMovement, InventoryReportRow, InventoryTransfer } from '@/types/inventory'

export const useInventoryStore = defineStore('inventory', () => {
  const balances = ref<InventoryBalance[]>([])
  const movements = ref<InventoryMovement[]>([])
  const counts = ref<InventoryCount[]>([])
  const transfers = ref<InventoryTransfer[]>([])
  const report = ref<InventoryReportRow[]>([])
  const deviation = ref<InventoryDeviationPoint[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalValue = computed(() => balances.value.reduce((sum, row) => sum + row.inventoryValue, 0))
  const pendingTransfers = computed(() => transfers.value.filter(x => x.status === 'dispatched').length)

  async function refresh(fromUtc?: string, toUtc?: string) {
    loading.value = true
    error.value = null
    try {
      const [nextBalances, nextMovements, nextCounts, nextTransfers] = await Promise.all([
        inventoryApi.getBalances(), inventoryApi.getMovements(), inventoryApi.getCounts(), inventoryApi.getTransfers(),
      ])
      balances.value = nextBalances
      movements.value = nextMovements
      counts.value = nextCounts
      transfers.value = nextTransfers
      if (fromUtc && toUtc) {
        ;[report.value, deviation.value] = await Promise.all([
          inventoryApi.getReport(fromUtc, toUtc), inventoryApi.getDeviation(fromUtc, toUtc),
        ])
      }
    } catch (cause: any) {
      error.value = cause?.message || 'No se pudo cargar el inventario'
      throw cause
    } finally {
      loading.value = false
    }
  }

  return { balances, movements, counts, transfers, report, deviation, loading, error, totalValue, pendingTransfers, refresh }
})
