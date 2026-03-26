<template>
    <BaseDialog :model-value="isOpen" @update:model-value="$emit('close')"
        :title="`Detalle - ${detail?.deliverymanName || ''}`" size="6xl">
        <div v-if="detail" class="space-y-4">
            <nav class="flex gap-1 border-b border-gray-200" aria-label="Vistas del detalle">
                <button type="button"
                    class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                    :class="activeTab === 'cycle'
                        ? 'bg-emerald-50 text-emerald-800 border border-b-0 border-gray-200 -mb-px'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
                    @click="activeTab = 'cycle'">
                    Ciclo actual
                </button>
                <button type="button"
                    class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                    :class="activeTab === 'fullday'
                        ? 'bg-slate-50 text-slate-800 border border-b-0 border-gray-200 -mb-px'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
                    @click="activeTab = 'fullday'">
                    Resumen del día
                </button>
            </nav>

            <p v-if="activeTab === 'cycle'" class="text-xs text-gray-500">
                Datos para cuadrar y liquidar (desde la última liquidación del día, si hubo).
            </p>
            <p v-else class="text-xs text-gray-500">
                Totales del día calendario completos (todos los pedidos entregados y abonos del día).
                Referencia; el monto a liquidar ahora está en <strong>Ciclo actual</strong>.
            </p>

            <!-- Ciclo actual -->
            <div v-show="activeTab === 'cycle'" class="space-y-6">
                <div v-if="cycleRouteStats" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-teal-50 rounded-lg p-4 border border-teal-100">
                        <p class="text-sm text-teal-700 font-medium">Rutas completadas (ciclo)</p>
                        <p class="text-2xl font-bold text-teal-900">{{ cycleRouteStats.completedRoutesCount }}</p>
                    </div>
                    <div class="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
                        <p class="text-sm text-cyan-700 font-medium">Distancia total aprox. (ciclo)</p>
                        <p class="text-2xl font-bold text-cyan-900">{{ formatRouteKm(cycleRouteStats.totalDistanceMeters) }}</p>
                        <p class="text-xs text-cyan-800/80 mt-1">Planeada + regreso a sucursal desde última entrega.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <p class="text-sm text-blue-600 font-medium">Pedidos entregados</p>
                        <p class="text-2xl font-bold text-blue-900">{{ detail.ordersCount }}</p>
                    </div>
                    <div class="bg-emerald-50 rounded-lg p-4">
                        <p class="text-sm text-emerald-600 font-medium">Efectivo recolectado</p>
                        <p class="text-2xl font-bold text-emerald-900">{{ formatCurrency(detail.totalCash) }}</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4">
                        <p class="text-sm text-purple-600 font-medium">Ganancia (delivery)</p>
                        <p class="text-2xl font-bold text-purple-900">{{ formatCurrency(detail.totalDeliveryFee) }}</p>
                    </div>
                    <div class="bg-orange-50 rounded-lg p-4">
                        <p class="text-sm text-orange-600 font-medium">Total abonos</p>
                        <p class="text-2xl font-bold text-orange-900">{{ formatCurrency(detail.totalAdvances) }}</p>
                    </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Dinero que debe tener (ciclo)</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Base inicial:</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(detail.baseAmount) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Efectivo recolectado:</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(detail.totalCash) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Total abonos:</span>
                            <span class="font-medium text-gray-900">- {{ formatCurrency(detail.totalAdvances) }}</span>
                        </div>
                        <div class="flex justify-between text-base font-bold border-t pt-2">
                            <span class="text-gray-700">Balance actual:</span>
                            <span :class="[
                                detail.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                            ]">
                                {{ formatCurrency(detail.currentBalance) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <h4 class="text-sm font-semibold text-gray-700">Pedidos del ciclo ({{ detail.orders.length }})</h4>
                        <button
                            v-if="detail.orders.length"
                            type="button"
                            class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
                            :class="groupByRouteCycle
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
                            @click="groupByRouteCycle = !groupByRouteCycle">
                            {{ groupByRouteCycle ? 'Ver lista plana' : 'Agrupar por ruta' }}
                        </button>
                    </div>
                    <div class="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <template v-if="!groupByRouteCycle">
                            <OrdersTable :orders="detail.orders" :loading="false" />
                        </template>
                        <template v-else>
                            <div v-for="block in cycleOrderBlocks" :key="block.key" class="border-b border-gray-100 last:border-b-0">
                                <div class="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700 flex flex-wrap gap-x-3 gap-y-1">
                                    <span>{{ block.title }}</span>
                                    <span v-if="block.subtitle" class="font-normal text-gray-600">{{ block.subtitle }}</span>
                                </div>
                                <OrdersTable :orders="block.orders" :loading="false" />
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Resumen del día -->
            <div v-show="activeTab === 'fullday'" class="space-y-6">
                <div v-if="fullDayRouteStats" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-teal-50 rounded-lg p-4 border border-teal-100">
                        <p class="text-sm text-teal-700 font-medium">Rutas completadas (día)</p>
                        <p class="text-2xl font-bold text-teal-900">{{ fullDayRouteStats.completedRoutesCount }}</p>
                    </div>
                    <div class="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
                        <p class="text-sm text-cyan-700 font-medium">Distancia total aprox. (día)</p>
                        <p class="text-2xl font-bold text-cyan-900">{{ formatRouteKm(fullDayRouteStats.totalDistanceMeters) }}</p>
                        <p class="text-xs text-cyan-800/80 mt-1">Planeada + regreso a sucursal desde última entrega.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <p class="text-sm text-blue-600 font-medium">Pedidos entregados</p>
                        <p class="text-2xl font-bold text-blue-900">{{ fullDay.ordersCount }}</p>
                    </div>
                    <div class="bg-emerald-50 rounded-lg p-4">
                        <p class="text-sm text-emerald-600 font-medium">Efectivo recolectado</p>
                        <p class="text-2xl font-bold text-emerald-900">{{ formatCurrency(fullDay.totalCash) }}</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-4">
                        <p class="text-sm text-purple-600 font-medium">Ganancia (delivery)</p>
                        <p class="text-2xl font-bold text-purple-900">{{ formatCurrency(fullDay.totalDeliveryFee) }}</p>
                    </div>
                    <div class="bg-orange-50 rounded-lg p-4">
                        <p class="text-sm text-orange-600 font-medium">Total abonos</p>
                        <p class="text-2xl font-bold text-orange-900">{{ formatCurrency(fullDay.totalAdvances) }}</p>
                    </div>
                </div>

                <div class="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Dinero del día (referencia)</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Base inicial:</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(fullDay.baseAmount) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Efectivo recolectado (día):</span>
                            <span class="font-medium text-gray-900">+ {{ formatCurrency(fullDay.totalCash) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Total abonos (día):</span>
                            <span class="font-medium text-gray-900">- {{ formatCurrency(fullDay.totalAdvances) }}</span>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Tiempo promedio entrega:</span>
                            <span class="font-medium text-gray-900">{{ fullDay.averageDeliveryTime }} min</span>
                        </div>
                        <div class="flex justify-between text-base font-bold border-t pt-2">
                            <span class="text-gray-700">Balance teórico día:</span>
                            <span :class="[
                                fullDay.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                            ]">
                                {{ formatCurrency(fullDay.currentBalance) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <h4 class="text-sm font-semibold text-gray-700">
                            Todos los pedidos del día ({{ fullDayOrdersList.length }})
                        </h4>
                        <button
                            v-if="fullDayOrdersList.length"
                            type="button"
                            class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
                            :class="groupByRouteFullDay
                                ? 'bg-slate-700 text-white border-slate-700'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
                            @click="groupByRouteFullDay = !groupByRouteFullDay">
                            {{ groupByRouteFullDay ? 'Ver lista plana' : 'Agrupar por ruta' }}
                        </button>
                    </div>
                    <div class="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                        <template v-if="!groupByRouteFullDay">
                            <OrdersTable :orders="fullDayOrdersList" :loading="false" />
                        </template>
                        <template v-else>
                            <div v-for="block in fullDayOrderBlocks" :key="block.key" class="border-b border-gray-100 last:border-b-0">
                                <div class="px-3 py-2 bg-slate-50 text-xs font-semibold text-gray-700 flex flex-wrap gap-x-3 gap-y-1">
                                    <span>{{ block.title }}</span>
                                    <span v-if="block.subtitle" class="font-normal text-gray-600">{{ block.subtitle }}</span>
                                </div>
                                <OrdersTable :orders="block.orders" :loading="false" />
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cerrar
            </BaseButton>
            <BaseButton v-if="canOpenLiquidation && activeTab === 'cycle'"
                type="button" @click="emit('open-liquidation')" variant="success" :loading="loading">
                Liquidar ({{ formatCurrency(detail!.currentBalance) }})
            </BaseButton>
            <p v-else-if="activeTab === 'cycle' && detail && detail.ordersOnTheWayCount && detail.ordersOnTheWayCount > 0"
                class="text-xs text-amber-800 mr-auto max-w-md">
                No se puede liquidar: hay {{ detail.ordersOnTheWayCount }} pedido(s) en camino. Entréguelos primero.
            </p>
            <p v-else-if="activeTab === 'cycle' && detail?.dayBlocked" class="text-xs text-amber-800 mr-auto">
                Domiciliario liquidado hoy. Desbloquea desde la tarjeta si necesitas operar de nuevo.
            </p>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
    DeliverymanDetail,
    DeliverymanRouteDayStats,
    DeliverymanRouteSummaryItem,
    DeliverymanStats,
} from '@/types/deliveryman.ts'
import type { OrderListItem } from '@/types/order'
import { useFormatting } from '@/composables/useFormatting'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import OrdersTable from '@/components/orders/OrdersTable.vue'

interface Props {
    isOpen: boolean
    detail: DeliverymanDetail | null
    loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'close': []
    'open-liquidation': []
}>()

const { formatCurrency } = useFormatting()

const activeTab = ref<'cycle' | 'fullday'>('cycle')
const groupByRouteCycle = ref(false)
const groupByRouteFullDay = ref(false)

watch(
    () => props.isOpen,
    (open) => {
        if (open) {
            activeTab.value = 'cycle'
            groupByRouteCycle.value = false
            groupByRouteFullDay.value = false
        }
    }
)

function formatRouteKm(meters: number): string {
    if (meters <= 0) return '0 km'
    return `${(meters / 1000).toFixed(1)} km`
}

function buildRouteOrderBlocks(
    orders: OrderListItem[],
    routeStats: DeliverymanRouteDayStats | undefined
): { key: string; title: string; subtitle: string; orders: OrderListItem[] }[] {
    const summaryById = new Map<number, DeliverymanRouteSummaryItem>(
        (routeStats?.routes ?? []).map((r) => [r.id, r])
    )
    const buckets = new Map<string, OrderListItem[]>()
    const keyFor = (o: OrderListItem) =>
        o.deliveryRouteId != null ? `r:${o.deliveryRouteId}` : 'none'

    for (const o of orders) {
        const k = keyFor(o)
        if (!buckets.has(k)) buckets.set(k, [])
        buckets.get(k)!.push(o)
    }

    const blocks: { key: string; title: string; subtitle: string; orders: OrderListItem[] }[] = []
    const keys = [...buckets.keys()].sort((a, b) => {
        if (a === 'none') return 1
        if (b === 'none') return -1
        const ida = Number(a.slice(2))
        const idb = Number(b.slice(2))
        return ida - idb
    })

    for (const k of keys) {
        const ords = buckets.get(k)!
        if (k === 'none') {
            blocks.push({
                key: k,
                title: 'Sin ruta registrada',
                subtitle: 'Pedidos anteriores a rutas o sin vínculo',
                orders: ords,
            })
        } else {
            const id = Number(k.slice(2))
            const s = summaryById.get(id)
            const km = s ? formatRouteKm(s.totalDistanceMeters) : null
            const when = s?.completedAtUtc
                ? new Date(s.completedAtUtc).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                : null
            blocks.push({
                key: k,
                title: `Ruta #${id}`,
                subtitle: [km ? `${km} (planeada + regreso)` : null, when ? `Cerrada ${when}` : null]
                    .filter(Boolean)
                    .join(' · '),
                orders: ords,
            })
        }
    }
    return blocks
}

const cycleRouteStats = computed(() => props.detail?.routeDayStats)
const fullDayRouteStats = computed(() => props.detail?.fullDayRouteDayStats)

const fullDayOrdersList = computed(() => props.detail?.fullDayOrders ?? props.detail?.orders ?? [])

const cycleOrderBlocks = computed(() =>
    props.detail ? buildRouteOrderBlocks(props.detail.orders, props.detail.routeDayStats) : []
)

const fullDayOrderBlocks = computed(() =>
    props.detail
        ? buildRouteOrderBlocks(fullDayOrdersList.value, props.detail.fullDayRouteDayStats)
        : []
)

/** Vista “día completo”; si faltara en respuestas antiguas, reutiliza el ciclo. */
const fullDay = computed((): DeliverymanStats => {
    const d = props.detail
    if (!d) {
        return {
            deliverymanId: 0,
            deliverymanName: '',
            ordersCount: 0,
            averageDeliveryTime: 0,
            totalCash: 0,
            totalDeliveryFee: 0,
            totalAdvances: 0,
            baseAmount: 0,
            currentBalance: 0,
        }
    }
    return d.fullDayStats ?? d
})

const canOpenLiquidation = computed(() => {
    const d = props.detail
    if (!d || d.dayBlocked) return false
    const onTheWay = d.ordersOnTheWayCount ?? 0
    return d.currentBalance > 0 && onTheWay === 0
})

</script>
