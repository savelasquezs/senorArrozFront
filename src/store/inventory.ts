import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { inventoryApi } from '@/services/MainAPI/inventoryApi'
import type {
  InventoryBalance,
  InventoryCount,
  InventoryDeviationPoint,
  InventoryMovement,
  InventoryReportRow,
  InventoryTransfer,
} from '@/types/inventory'

export type InventoryDataSection = 'balances' | 'movements' | 'counts' | 'transfers' | 'reports'

export const useInventoryStore = defineStore('inventory', () => {
  const balances = ref<InventoryBalance[]>([])
  const movements = ref<InventoryMovement[]>([])
  const counts = ref<InventoryCount[]>([])
  const transfers = ref<InventoryTransfer[]>([])
  const report = ref<InventoryReportRow[]>([])
  const deviation = ref<InventoryDeviationPoint[]>([])
  const loadingBySection = reactive<Record<InventoryDataSection, boolean>>({
    balances: false,
    movements: false,
    counts: false,
    transfers: false,
    reports: false,
  })
  const errors = reactive<Partial<Record<InventoryDataSection, string>>>({})

  const loading = computed(() => Object.values(loadingBySection).some(Boolean))
  const error = computed(() => Object.values(errors).find(Boolean) ?? null)
  const totalValue = computed(() => balances.value.reduce((sum, row) => sum + row.inventoryValue, 0))
  const itemsWithStock = computed(() => balances.value.filter(row => row.quantityOnHand > 0).length)
  const pendingTransfers = computed(() => transfers.value.filter(row => row.status === 'dispatched').length)
  const latestConfirmedCount = computed(() => counts.value
    .filter(row => row.status === 'confirmed' && row.confirmedAt)
    .sort((a, b) => new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime())[0] ?? null)

  async function run<T>(section: InventoryDataSection, work: () => Promise<T>, assign: (value: T) => void) {
    loadingBySection[section] = true
    delete errors[section]
    try {
      const value = await work()
      assign(value)
      return value
    } catch (cause: any) {
      errors[section] = cause?.message || 'No se pudo cargar la información'
      throw cause
    } finally {
      loadingBySection[section] = false
    }
  }

  const loadBalances = () => run('balances', () => inventoryApi.getBalances(), value => { balances.value = value })
  const loadMovements = () => run('movements', () => inventoryApi.getMovements(), value => { movements.value = value })
  const loadCounts = () => run('counts', () => inventoryApi.getCounts(), value => { counts.value = value })
  const loadTransfers = () => run('transfers', () => inventoryApi.getTransfers(), value => { transfers.value = value })
  const loadReports = (fromUtc: string, toUtc: string) => run(
    'reports',
    () => Promise.all([inventoryApi.getReport(fromUtc, toUtc), inventoryApi.getDeviation(fromUtc, toUtc)]),
    ([nextReport, nextDeviation]) => {
      report.value = nextReport
      deviation.value = nextDeviation
    },
  )

  async function refresh(fromUtc?: string, toUtc?: string) {
    await Promise.all([loadBalances(), loadMovements(), loadCounts(), loadTransfers()])
    if (fromUtc && toUtc) await loadReports(fromUtc, toUtc)
  }

  return {
    balances,
    movements,
    counts,
    transfers,
    report,
    deviation,
    loadingBySection,
    errors,
    loading,
    error,
    totalValue,
    itemsWithStock,
    pendingTransfers,
    latestConfirmedCount,
    loadBalances,
    loadMovements,
    loadCounts,
    loadTransfers,
    loadReports,
    refresh,
  }
})
