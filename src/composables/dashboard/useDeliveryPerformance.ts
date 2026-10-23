import { computed } from 'vue'
import type { DeliveryPerformance, DeliveryPerformanceSummary } from '@/types/deliveryPerformance'

type Metric = keyof DeliveryPerformanceSummary
export const DELIVERY_TEAM_METRICS: ReadonlySet<Metric> = new Set(['avgRouteMinutes', 'avgOrderMinutes', 'minutesPerKm', 'onTimePercent'])
const number = (value: number, digits = 1) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(value)
const definitions: Array<{ key: Metric; title: string; unit: string; sample: Metric; direction: number; description: string }> = [
  { key: 'deliveredCount', title: 'Pedidos entregados', unit: '', sample: 'completedRoutesCount', direction: 0, description: 'rutas completadas' },
  { key: 'onTimePercent', title: 'Rutas a tiempo', unit: '%', sample: 'slaSampleCount', direction: 1, description: 'rutas con SLA' },
  { key: 'avgRouteMinutes', title: 'Tiempo por ruta', unit: 'min', sample: 'routeSampleCount', direction: -1, description: 'rutas con salida y regreso' },
  { key: 'avgOrderMinutes', title: 'Tiempo por pedido', unit: 'min', sample: 'orderSampleCount', direction: -1, description: 'pedidos evaluables' },
  { key: 'minutesPerKm', title: 'Minutos por km', unit: 'min/km', sample: 'gpsSampleCount', direction: -1, description: 'rutas con GPS suficiente' },
  { key: 'ordersPerRoute', title: 'Pedidos por ruta', unit: '', sample: 'completedRoutesCount', direction: 0, description: 'rutas completadas' },
  { key: 'p90OrderMinutes', title: 'Entrega P90', unit: 'min', sample: 'orderSampleCount', direction: -1, description: 'pedidos · 90 % dentro de este tiempo' },
]

export function useDeliveryPerformance(getPerformance: () => DeliveryPerformance | null | undefined, compareWithTeam: () => boolean = () => false) {
  const cards = computed(() => definitions.map(def => {
    const current = getPerformance()?.current
    const previous = getPerformance()?.previous
    const value = current?.[def.key]
    const teamComparison = compareWithTeam() && DELIVERY_TEAM_METRICS.has(def.key)
    const reference = teamComparison ? getPerformance()?.team : previous
    const before = reference?.[def.key]
    const sample = (def.key === 'minutesPerKm' ? current?.distanceSampleCount : undefined) ?? current?.[def.sample] ?? 0
    const difference = value != null && before != null ? Math.round((value - before) * 10) / 10 : null
    const delta = value != null && before != null && before !== 0 ? (def.key === 'onTimePercent' ? value - before : 100 * (value - before) / before) : null
    const activeDelta = teamComparison ? difference : delta
    const favorable = activeDelta == null || activeDelta === 0 || def.direction === 0 ? null : activeDelta * def.direction > 0
    const teamLabel = difference == null ? 'Sin comparación disponible' : difference === 0 ? 'Igual al resto del equipo'
      : `${number(Math.abs(difference))} ${def.key === 'onTimePercent' ? 'pp' : def.unit} ${difference > 0 ? 'más' : 'menos'} que el resto`
    return { ...def, value: value == null ? '—' : number(value, def.key === 'deliveredCount' ? 0 : 1),
      counterpart: def.key === 'onTimePercent' && sample > 0 && value != null
        ? number(100 - Math.round(value * 10) / 10) : null,
      sample: def.key === 'minutesPerKm' && (current?.estimatedDistanceSampleCount ?? 0) > 0
          ? `${number(sample, 0)} rutas · ${number(current!.estimatedDistanceSampleCount!, 0)} estimadas` : `${number(sample, 0)} ${def.description}`,
      referenceLabel: teamComparison ? `Resto: ${before == null ? 'sin datos' : `${number(before)} ${def.unit}`}` : null,
      delta: teamComparison ? teamLabel : delta == null ? 'Sin periodo anterior' : `${delta > 0 ? '+' : ''}${number(delta)} ${def.key === 'onTimePercent' ? 'pp' : '%'} vs periodo anterior`,
      favorable,
    }
  }))
  const charts: Array<{ title: string; description: string; metrics: Metric[]; labels: string[]; unit: string; colors: string[]; stacked?: boolean }> = [
    { title: 'Cumplimiento de SLA', description: 'Rutas a tiempo entre las que tienen SLA evaluable.', metrics: ['onTimePercent'], labels: ['A tiempo'], unit: '%', colors: ['#059669'] },
    { title: 'Duración de las rutas', description: 'Salida → regreso. La asignación que pone los pedidos En camino registra la salida de la ruta.', metrics: ['avgRouteMinutes', 'avgMetaMinutes'], labels: ['Duración de la ruta', 'Meta de SLA'], unit: 'min', colors: ['#059669', '#94a3b8'] },
    { title: 'Tiempo de entrega por pedido', description: 'En camino → Entregado, con fechas del pedido. P90: 90 % entregado dentro de ese tiempo.', metrics: ['avgOrderMinutes', 'p90OrderMinutes'], labels: ['Promedio', 'P90'], unit: 'min', colors: ['#2563eb', '#a78bfa'] },
    { title: 'Tiempo por kilómetro', description: 'GPS suficiente o distancia planificada de ida y regreso (estimación). Tiempo desde la salida hasta el regreso, incluidas las paradas.', metrics: ['minutesPerKm'], labels: ['Minutos por km'], unit: 'min/km', colors: ['#0891b2'] },
    { title: 'Volumen de entregas', description: 'Pedidos por fecha efectiva de entrega y rutas por fecha de regreso.', metrics: ['deliveredCount', 'completedRoutesCount'], labels: ['Pedidos', 'Rutas'], unit: '', colors: ['#059669', '#94a3b8'] },
    { title: 'Aprovechamiento de cada salida', description: 'Pedidos entregados en las mismas rutas completadas del periodo.', metrics: ['ordersPerRoute'], labels: ['Pedidos por ruta'], unit: 'pedidos/ruta', colors: ['#d97706'] },
    { title: 'Tiempo de cada etapa de la ruta', description: 'Espera en sucursal, entrega de pedidos y regreso. La salida incluye el cambio de los pedidos a En camino.', metrics: ['avgDispatchMinutes', 'avgDeliveryStageMinutes', 'avgReturnMinutes'], labels: ['Espera de despacho', 'Reparto', 'Regreso'], unit: 'min', colors: ['#fbbf24', '#059669', '#60a5fa'], stacked: true },
  ]
  return { cards, charts }
}
