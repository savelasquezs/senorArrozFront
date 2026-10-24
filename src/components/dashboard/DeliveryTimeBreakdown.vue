<template>
  <div>
    <p v-if="!compact && summary.inconsistentReturnCount" class="text-amber-700" :class="compact ? 'mb-1 text-[9px]' : 'mb-3 text-xs'">{{ summary.inconsistentReturnCount }} {{ summary.inconsistentReturnCount === 1 ? 'regreso inconsistente excluido' : 'regresos inconsistentes excluidos' }} de los promedios de tiempo.</p>
    <div v-if="!summary.stageSampleCount" class="rounded-xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">No hay rutas con fechas válidas para las tres etapas en este periodo.</div>
    <template v-else>
      <div class="grid grid-cols-3" :class="compact ? 'gap-1' : 'gap-3'">
        <div v-for="stage in stages" :key="stage.key" class="rounded-lg border border-slate-100 bg-slate-50/60" :class="compact ? 'flex items-center justify-between gap-x-1 p-1' : 'p-3'" :title="`${stage.title}: ${stage.description}`">
          <p class="flex items-center gap-1 font-semibold text-slate-700" :class="compact ? 'text-[9px]' : 'text-xs'"><span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: stage.color }" />{{ compact ? stage.short : stage.title }}</p>
          <p class="whitespace-nowrap font-bold text-slate-900" :class="compact ? 'text-xs' : 'mt-2 text-xl'">{{ format(summary[stage.key]) }} <span class="text-[10px] font-normal text-slate-500">min</span></p>
          <p v-if="!compact" class="mt-1 text-[11px] text-slate-500">{{ stage.description }}</p>
        </div>
      </div>
      <p class="text-slate-500" :class="compact ? 'my-1 text-[9px]' : 'my-4 text-xs'">{{ summary.stageSampleCount }} rutas con etapas válidas · <strong class="text-slate-700">{{ format(total(summary)) }} min</strong> de listo a regreso · {{ visibleRows.length }} {{ comparison ? (visibleRows.length === 1 ? 'domiciliario' : 'domiciliarios') : (visibleRows.length === 1 ? 'periodo' : 'periodos') }} con datos.</p>
      <div class="overflow-y-auto pr-1" :class="compact ? 'max-h-[32px] space-y-1.5' : 'max-h-[28rem] space-y-4'" tabindex="0" aria-label="Detalle de etapas por periodo o domiciliario">
        <div v-for="row in visibleRows" :key="row.label" :class="compact ? 'space-y-0.5' : 'space-y-1.5'">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1" :class="compact ? 'text-[9px]' : 'text-xs'">
            <p class="font-medium text-slate-700">{{ row.label }} <span class="ml-1 font-normal text-slate-400">{{ row.data.stageSampleCount }} {{ row.data.stageSampleCount === 1 ? 'ruta' : 'rutas' }}</span></p>
            <p class="font-semibold tabular-nums text-slate-800">{{ format(total(row.data)) }} min en total</p>
          </div>
          <div class="flex overflow-hidden rounded-md bg-slate-100" :class="compact ? 'h-4' : 'h-7'" :style="{ width: `${Math.max(2, 100 * total(row.data) / maxTotal)}%` }" :aria-label="description(row.data)">
            <span v-for="stage in stages" :key="stage.key" class="flex min-w-0 items-center justify-center overflow-hidden text-[10px] font-semibold" :class="stage.key === 'avgDispatchMinutes' ? 'text-amber-950' : 'text-white'" :style="{ width: `${total(row.data) > 0 ? 100 * (row.data[stage.key] ?? 0) / total(row.data) : 0}%`, backgroundColor: stage.color }" :title="`${stage.title}: ${format(row.data[stage.key])} min`">{{ (row.data[stage.key] ?? 0) / maxTotal > .1 ? format(row.data[stage.key]) : '' }}</span>
          </div>
          <p v-if="!compact" class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span v-for="stage in stages" :key="stage.key"><span class="mr-1 inline-block h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: stage.color }" />{{ stage.short }}: <strong class="font-medium text-slate-700">{{ format(row.data[stage.key]) }} min</strong></span></p>
        </div>
      </div>
      <p v-if="!compact && rows.length > visibleRows.length" class="text-slate-400" :class="compact ? 'mt-1 text-[9px]' : 'mt-4 border-t border-slate-100 pt-3 text-[11px]'">{{ omitted === 1 ? 'Se omite' : 'Se omiten' }} {{ omitted }} {{ comparison ? (omitted === 1 ? 'domiciliario' : 'domiciliarios') : (omitted === 1 ? 'periodo' : 'periodos') }} sin datos completos.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeliveryPerformanceSummary } from '@/types/deliveryPerformance'
const props = defineProps<{ summary: DeliveryPerformanceSummary; rows: Array<{ label: string; data: DeliveryPerformanceSummary }>; comparison: boolean; compact?: boolean }>()
const stages = [
  { key: 'avgDispatchMinutes', title: '1. Espera en sucursal', short: 'Espera', description: 'Último pedido listo → salida', color: '#fbbf24' },
  { key: 'avgDeliveryStageMinutes', title: '2. Entrega de pedidos', short: 'Entregas', description: 'Salida → última entrega', color: '#059669' },
  { key: 'avgReturnMinutes', title: '3. Regreso a sucursal', short: 'Regreso', description: 'Última entrega → regreso', color: '#3b82f6' },
] as const
const format = (value: number | null) => value == null ? '—' : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)
const total = (row: DeliveryPerformanceSummary) => stages.reduce((sum, stage) => sum + (row[stage.key] ?? 0), 0)
const visibleRows = computed(() => props.rows.filter(row => row.data.stageSampleCount > 0 && stages.every(stage => row.data[stage.key] != null)))
const omitted = computed(() => props.rows.length - visibleRows.value.length)
const maxTotal = computed(() => Math.max(1, ...visibleRows.value.map(row => total(row.data))))
const description = (row: DeliveryPerformanceSummary) => stages.map(stage => `${stage.short}: ${format(row[stage.key])} minutos`).join(', ')
</script>
