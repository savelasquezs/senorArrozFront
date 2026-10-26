import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { createSerialRefresh, type RefreshContext } from '@/utils/serialRefresh'
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

  const jobs = new Map<InventoryDataSection, (context: RefreshContext) => Promise<void>>()
  const refreshers = new Map<InventoryDataSection, ReturnType<typeof createSerialRefresh>>()
  function run<T>(section: InventoryDataSection, work: (signal: AbortSignal) => Promise<T>, assign: (value: T) => void) {
    jobs.set(section, async context => {
      loadingBySection[section] = true
      delete errors[section]
      try {
        const value = await work(context.signal)
        if (context.isCurrent()) assign(value)
      } catch (cause: any) {
        if (context.isCurrent()) {
          errors[section] = cause?.message || 'No se pudo cargar la información'
          throw cause
        }
      } finally {
        if (context.isCurrent()) loadingBySection[section] = false
      }
    })
    if (!refreshers.has(section)) refreshers.set(section, createSerialRefresh(context => jobs.get(section)!(context)))
    return refreshers.get(section)!.request(true)
  }
  function clear() {
    refreshers.forEach(refresh => refresh.dispose())
    refreshers.clear()
    jobs.clear()
    balances.value = []; movements.value = []; counts.value = []; transfers.value = []; report.value = []; deviation.value = []
    for (const section of Object.keys(loadingBySection) as InventoryDataSection[]) {
      loadingBySection[section] = false
      delete errors[section]
    }
  }

  const loadBalances = () => run('balances', signal => inventoryApi.getBalances(signal), value => { balances.value = value })
  const loadMovements = () => run('movements', signal => inventoryApi.getMovements(200, signal), value => { movements.value = value })
  const loadCounts = () => run('counts', signal => inventoryApi.getCounts(signal), value => { counts.value = value })
  const loadTransfers = () => run('transfers', signal => inventoryApi.getTransfers(signal), value => { transfers.value = value })
  const loadReports = (fromUtc: string, toUtc: string) => run(
    'reports',
    signal => Promise.all([inventoryApi.getReport(fromUtc, toUtc, signal), inventoryApi.getDeviation(fromUtc, toUtc, signal)]),
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
    clear,
  }
})
