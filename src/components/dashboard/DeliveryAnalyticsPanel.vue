<template>
  <div class="space-y-1.5" :aria-busy="busy ?? false">
    <header class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-base font-bold tracking-tight text-slate-900">Rendimiento de domiciliarios</h1>
        <div class="flex items-center gap-2"><span class="text-[10px] text-slate-500">Periodo</span><BaseDateRangePicker :model-value="dateRange" class="w-64" aria-label="Periodo del dashboard" variant="compact" @update:model-value="emit('update:dateRange', $event)" /></div>
      </div>
      <div class="mt-1 flex flex-wrap items-end gap-1.5">
        <label v-if="showBranchFilter" class="min-w-36 flex-1 text-[10px] font-medium text-slate-600"><span class="sr-only">Sucursal</span>
          <select aria-label="Sucursal" class="block min-h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-emerald-600" :value="branchId ?? ''" @change="changeBranch">
            <option value="">Todas las sucursales</option><option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
          </select>
        </label>
        <label class="min-w-40 flex-1 text-[10px] font-medium text-slate-600"><span class="sr-only">Domiciliario</span>
          <select aria-label="Domiciliario" class="block min-h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:outline-emerald-600" :value="driverId" @change="emit('update:driverId', ($event.target as HTMLSelectElement).value === 'all' ? 'all' : Number(($event.target as HTMLSelectElement).value))">
            <option value="all">Todos los domiciliarios</option><option v-for="driver in driverOptions" :key="driver.id" :value="driver.id">{{ driver.name }}</option>
          </select>
        </label>
        <div class="flex min-h-8 items-center gap-1 rounded-lg bg-slate-100 p-0.5" aria-label="Modo de gráficas">
          <button type="button" class="rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-40" :class="comparison ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'" :disabled="driverId !== 'all'" :aria-pressed="comparison" @click="mode = 'comparison'">Comparar equipo</button>
          <button type="button" class="rounded-md px-2 py-1.5 text-[10px] font-medium" :class="!comparison ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'" :aria-pressed="!comparison" @click="mode = 'history'">Ver evolución</button>
        </div>
        <button type="button" aria-label="Excluir miércoles" :aria-pressed="excludeWednesdays ?? false" class="min-h-8 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors" :class="excludeWednesdays ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'" @click="emit('update:excludeWednesdays', !excludeWednesdays)">{{ excludeWednesdays ? '✓ Miércoles excluidos' : 'Excluir miércoles' }}</button>
      </div>
      <p v-if="busy" class="mt-3 text-xs text-emerald-700" role="status">Actualizando indicadores…</p>
    </header>

    <div v-if="!performance && !busy" class="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800" role="status">Las métricas de rendimiento todavía no están disponibles. Vuelve a cargar la sección.</div>
    <template v-else-if="performance">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 min-[56.25rem]:grid-cols-7">
        <article v-for="(card, index) in cards" :key="card.key" class="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm" :class="index === 0 ? 'border-emerald-200 bg-emerald-50/40' : ''">
          <p class="text-[10px] font-medium leading-3 text-slate-500">{{ card.title }}{{ card.key === 'onTimePercent' && !individual ? ' · equipo' : '' }}</p>
          <div class="mt-0.5 flex items-center justify-between gap-1">
            <p class="flex flex-wrap items-baseline gap-1 text-lg font-bold leading-[22px] tracking-tight text-slate-900 tabular-nums">{{ card.value }} <span class="text-[9px] font-medium text-slate-500">{{ card.value !== '—' ? card.unit : '' }}</span></p>
            <p v-if="card.counterpart" class="shrink-0 text-right text-[9px] font-medium leading-3 text-rose-600" title="Rutas con retraso entre las mismas rutas con SLA evaluable">{{ card.counterpart }} %<span class="block text-[8px]">con retraso</span></p>
          </div>
          <p class="mt-0.5 truncate text-[9px] leading-3 text-slate-500" :title="card.sample">{{ card.sample }}</p>
          <div class="mt-0.5 border-t border-slate-100 pt-0.5 text-[9px] leading-3">
            <p v-if="card.referenceLabel" class="font-medium text-slate-600">{{ card.referenceLabel }}</p>
            <p :class="card.favorable === true ? 'text-emerald-700' : card.favorable === false ? 'text-rose-600' : 'text-slate-400'" :title="card.delta">{{ card.referenceLabel ? card.delta.replace(' que el resto', '').replace('Igual al resto del equipo', 'Igual al resto') : card.delta }}</p>
          </div>
        </article>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-1 text-[9px] text-slate-500">
        <p :title="individual ? 'El promedio excluye al domiciliario seleccionado y respeta las mismas fechas y días excluidos.' : ''"><span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />{{ individual ? `Comparación: resto del equipo de ${teamScope} · Excluye al seleccionado` : comparison ? 'Comparación del equipo en el periodo' : 'Evolución histórica del filtro seleccionado' }}</p>
        <p>{{ performance.current.gpsSampleCount }}/{{ performance.current.completedRoutesCount }} rutas con GPS suficiente<span v-if="performance.current.estimatedDistanceSampleCount"> · {{ performance.current.estimatedDistanceSampleCount }} con distancia planificada (estimación)</span> · {{ performance.current.orderSampleCount }} pedidos con tiempo evaluable<span v-if="performance.current.inconsistentReturnCount" class="text-amber-700"> · {{ performance.current.inconsistentReturnCount }} regresos inconsistentes excluidos de tiempos</span></p>
      </div>
      <div v-if="!performance.current.deliveredCount && !performance.current.completedRoutesCount" class="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No hay entregas ni rutas completadas con estos filtros. Prueba otro periodo.</div>
      <div class="grid min-w-0 gap-2 sm:grid-cols-2 min-[56.25rem]:grid-cols-3">
        <section v-for="chart in charts" :key="chart.title" class="min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" :class="chart.stacked ? 'min-[56.25rem]:col-span-2' : ''">
          <div class="mb-1 flex items-start justify-between gap-2"><div class="min-w-0"><h2 class="text-[11px] font-semibold text-slate-900">{{ chartTitle(chart) }}</h2><p class="truncate text-[9px] leading-3 text-slate-500" :title="chartDescription(chart)">{{ chartDescription(chart) }}</p></div><div class="flex shrink-0 items-center gap-1"><span v-if="chart.unit" class="text-[9px] text-slate-400">{{ chart.unit }}</span><button type="button" :aria-label="`Ampliar ${chartTitle(chart)}`" aria-haspopup="dialog" title="Ampliar gráfica" class="flex size-6 items-center justify-center rounded text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600" @click="expandedChart = chart"><ArrowsPointingOutIcon class="size-3.5" /></button></div></div>
          <DeliveryTimeBreakdown v-if="chart.stacked" compact :summary="performance.current" :rows="breakdownRows" :comparison="comparison" />
          <div v-else-if="!hasChartData(chart.metrics)" class="flex h-40 items-center justify-center rounded-lg bg-slate-50 px-3 text-center text-[10px] text-slate-400 min-[56.25rem]:h-[90px]">Sin datos suficientes para este indicador en el periodo.</div>
          <DashboardHorizontalBarChart v-else-if="comparison" compact :labels="chartLabels" :datasets="datasets(chart)" :stacked="chart.stacked" :y-format="chart.unit === '%' ? 'percent' : 'number'" />
          <DashboardLineChart v-else compact :labels="chartLabels" :datasets="datasets(chart)" :y-format="chart.unit === '%' ? 'percent' : 'number'" :curve-tension="0" :span-gaps="false" />
        </section>
        <DeliveryRouteHistoryList compact :routes="performance.recentRoutes" :branch-id="branchId" :load-detail="loadRouteDetail" />
      </div>
      <BaseDialog v-model="chartDialogOpen" :title="expandedChart ? chartTitle(expandedChart) : ''" size="7xl" mobile-full-screen scroll-body>
        <template v-if="expandedChart">
          <p class="text-xs text-slate-500">{{ rangeText }} · {{ teamScope }} · {{ individual ? selectedDriverName : 'Todos los domiciliarios' }}{{ excludeWednesdays ? ' · Miércoles excluidos' : '' }}</p>
          <p class="mt-2 text-sm text-slate-600">{{ chartDescription(expandedChart) }}</p>
          <p v-if="comparesTeam(expandedChart)" class="mt-1 text-xs text-slate-500">El promedio del resto del equipo excluye a {{ selectedDriverName }}.</p>
          <div class="mt-5 min-w-0">
            <DeliveryTimeBreakdown v-if="expandedChart.stacked" :summary="performance.current" :rows="breakdownRows" :comparison="comparison" />
            <div v-else-if="!hasChartData(expandedChart.metrics)" class="flex min-h-72 items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Sin datos suficientes para este indicador en el periodo.</div>
            <DashboardHorizontalBarChart v-else-if="comparison" expanded :labels="chartLabels" :datasets="datasets(expandedChart)" :y-format="expandedChart.unit === '%' ? 'percent' : 'number'" />
            <DashboardLineChart v-else expanded :labels="chartLabels" :datasets="datasets(expandedChart)" :y-format="expandedChart.unit === '%' ? 'percent' : 'number'" :curve-tension="0" :span-gaps="false" />
          </div>
        </template>
      </BaseDialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseDateRangePicker from '@/components/ui/BaseDateRangePicker.vue'
import DashboardHorizontalBarChart from './DashboardHorizontalBarChart.vue'
import DashboardLineChart from './DashboardLineChart.vue'
import DeliveryTimeBreakdown from './DeliveryTimeBreakdown.vue'
import DeliveryRouteHistoryList from '@/components/delivery/DeliveryRouteHistoryList.vue'
import { DELIVERY_TEAM_METRICS, useDeliveryPerformance } from '@/composables/dashboard/useDeliveryPerformance'
import { defaultBusinessCalendar } from '@/utils/datetime'
import type { DeliveryBranchOption } from './operation.types'
import type { LineChartDataset } from './lineChart.types'
import type { DeliveryPerformance, DeliveryPerformanceSummary, DeliveryRouteDetail } from '@/types/deliveryPerformance'

const props = defineProps<{
  performance?: DeliveryPerformance | null
  branchId: number | null
  driverId: number | 'all'
  showBranchFilter: boolean
  branchOptions: DeliveryBranchOption[]
  dateRange: [Date, Date]
  loadRouteDetail?: (id: number) => Promise<DeliveryRouteDetail>
  excludeWednesdays?: boolean
  busy?: boolean
}>()
const emit = defineEmits<{ 'update:branchId': [value: number | null]; 'update:driverId': [value: number | 'all']; 'update:excludeWednesdays': [value: boolean]; 'update:dateRange': [value: [Date, Date]] }>()
const mode = ref<'comparison' | 'history'>('comparison')
const individual = computed(() => props.driverId !== 'all')
const retainedDriver = ref<{ id: number; name: string } | null>(null)
watchEffect(() => {
  if (props.driverId === 'all') { retainedDriver.value = null; return }
  const selected = props.performance?.driverOptions.find(driver => driver.id === props.driverId)
  if (selected) retainedDriver.value = { id: selected.id, name: selected.name }
})
const driverOptions = computed(() => {
  const options = props.performance?.driverOptions ?? []
  const retained = retainedDriver.value
  return retained && retained.id === props.driverId && !options.some(driver => driver.id === props.driverId)
    ? [...options, retained] : options
})
const selectedDriverName = computed(() => driverOptions.value.find(driver => driver.id === props.driverId)?.name ?? 'Domiciliario')
const comparison = computed(() => props.driverId === 'all' && mode.value === 'comparison')
const teamScope = computed(() => props.branchId == null ? 'todas las sucursales' : props.branchOptions.find(branch => branch.id === props.branchId)?.name ?? 'la sucursal seleccionada')
const rows = computed(() => comparison.value ? props.performance?.drivers ?? [] : props.performance?.evolution ?? [])
const chartLabels = computed(() => comparison.value ? props.performance?.drivers.map(d => d.name) ?? [] : props.performance?.labels ?? [])
const breakdownRows = computed(() => rows.value.map((data, index) => ({ label: chartLabels.value[index] ?? '', data })))
const rangeText = computed(() => `${defaultBusinessCalendar.formatDateShort(props.dateRange[0])} — ${defaultBusinessCalendar.formatDateShort(props.dateRange[1])}`)
const { cards, charts } = useDeliveryPerformance(() => props.performance, () => individual.value)
const expandedChart = ref<(typeof charts)[number] | null>(null)
const chartDialogOpen = computed({ get: () => expandedChart.value !== null, set: (open: boolean) => { if (!open) expandedChart.value = null } })
function comparesTeam(chart: typeof charts[number]) { return individual.value && DELIVERY_TEAM_METRICS.has(chart.metrics[0]!) }
function datasets(chart: typeof charts[number]): LineChartDataset[] {
  if (chart.metrics[0] === 'minutesPerKm') {
    const values: LineChartDataset[] = [
      { label: 'GPS', data: rows.value.map(row => row.gpsMinutesPerKm === undefined ? row.minutesPerKm : row.gpsMinutesPerKm), borderColor: '#0891b2', backgroundColor: '#0891b2' },
      { label: 'Estimación planificada', data: rows.value.map(row => row.estimatedMinutesPerKm ?? null), borderColor: '#d97706', backgroundColor: '#d97706', borderDash: [4, 3] },
    ]
    if (comparesTeam(chart)) values.push({ label: 'Resto del equipo', data: props.performance?.teamEvolution?.map(row => row.minutesPerKm) ?? [], borderColor: '#64748b', backgroundColor: '#64748b', borderDash: [6, 4], pointRadius: 2 })
    return values
  }
  if (comparesTeam(chart)) {
    const key = chart.metrics[0]!
    return [
      { label: selectedDriverName.value, data: rows.value.map(row => row[key] ?? null), backgroundColor: chart.colors[0], borderColor: chart.colors[0] },
      { label: 'Resto del equipo', data: props.performance?.teamEvolution?.map(row => row[key] ?? null) ?? [], borderColor: '#64748b', backgroundColor: '#64748b', borderDash: [6, 4], pointRadius: 2 },
    ]
  }
  return chart.metrics.map((key, i) => ({ label: chart.labels[i]!, data: rows.value.map(row => row[key] ?? null), backgroundColor: chart.colors[i], borderColor: chart.colors[i] }))
}
function chartTitle(chart: typeof charts[number]) {
  if (chart.metrics[0] !== 'onTimePercent') return chart.title
  return comparison.value ? 'Rutas a tiempo por domiciliario' : individual.value ? `Rutas a tiempo · ${selectedDriverName.value}` : 'Rutas a tiempo del equipo'
}
function chartDescription(chart: typeof charts[number]) {
  if (chart.metrics[0] === 'onTimePercent' && comparison.value)
    return 'Cada barra es un domiciliario. El KPI superior resume todas las rutas del equipo.'
  if (!comparesTeam(chart)) return chart.description
  if (chart.metrics[0] === 'avgOrderMinutes') return 'En camino → Entregado, según el pedido. Línea punteada: promedio de los demás en cada fecha.'
  if (chart.metrics[0] === 'avgRouteMinutes') return 'Salida → regreso, incluida la salida registrada al poner los pedidos En camino. Línea punteada: promedio de los demás.'
  if (chart.metrics[0] === 'minutesPerKm') return 'Turquesa: GPS suficiente. Ámbar: distancia planificada de ida y regreso (estimación). Gris: resto del equipo, incluyendo estimaciones. Tiempo: salida → regreso.'
  return `${chart.description} Línea punteada: promedio de los demás en cada fecha.`
}
function hasChartData(metrics: Array<keyof DeliveryPerformanceSummary>) {
  if (individual.value && DELIVERY_TEAM_METRICS.has(metrics[0]!))
    return [...rows.value, ...props.performance?.teamEvolution ?? []].some(row => row[metrics[0]!] != null)
  return rows.value.some(row => metrics.some(key => row[key] != null))
}
function changeBranch(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:driverId', 'all')
  emit('update:branchId', value === '' ? null : Number(value))
}
</script>
