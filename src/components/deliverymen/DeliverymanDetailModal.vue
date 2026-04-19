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
                <button
                    v-if="showPayrollTab"
                    type="button"
                    class="px-4 py-2 text-sm font-medium rounded-t-lg transition-colors"
                    :class="activeTab === 'payroll'
                        ? 'bg-violet-50 text-violet-900 border border-b-0 border-gray-200 -mb-px'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'"
                    @click="activeTab = 'payroll'">
                    Nómina / quincena
                </button>
            </nav>

            <p v-if="activeTab === 'cycle'" class="text-xs text-gray-500">
                Datos para cuadrar y liquidar (desde la última liquidación del día, si hubo).
                Incluye pedidos <strong>en el local</strong> con domiciliario asignado, además de delivery.
            </p>
            <p v-else-if="activeTab === 'fullday'" class="text-xs text-gray-500">
                Totales del día calendario completos (pedidos entregados con este domiciliario: delivery y en el local).
                Referencia; el monto a liquidar ahora está en <strong>Ciclo actual</strong>.
            </p>
            <p v-else-if="activeTab === 'payroll'" class="text-xs text-gray-500">
                Préstamos y gastos de quincena (líneas del catálogo asignado al domiciliario) y totales de delivery pagables.
                Por defecto: <strong>quincena actual</strong> o <strong>mes actual</strong> con un clic.
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
                                <div class="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700">
                                    <div class="flex flex-wrap gap-x-3 gap-y-1">
                                        <span>{{ block.title }}</span>
                                        <span v-if="block.subtitle" class="font-normal text-gray-600">{{ block.subtitle }}</span>
                                    </div>
                                    <ul v-if="block.scheduleLines?.length"
                                        class="mt-1.5 space-y-0.5 text-[11px] font-normal text-gray-600 leading-snug list-none pl-0">
                                        <li v-for="(line, idx) in block.scheduleLines" :key="idx">{{ line }}</li>
                                    </ul>
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
                                <div class="px-3 py-2 bg-slate-50 text-xs font-semibold text-gray-700">
                                    <div class="flex flex-wrap gap-x-3 gap-y-1">
                                        <span>{{ block.title }}</span>
                                        <span v-if="block.subtitle" class="font-normal text-gray-600">{{ block.subtitle }}</span>
                                    </div>
                                    <ul v-if="block.scheduleLines?.length"
                                        class="mt-1.5 space-y-0.5 text-[11px] font-normal text-gray-600 leading-snug list-none pl-0">
                                        <li v-for="(line, idx) in block.scheduleLines" :key="idx">{{ line }}</li>
                                    </ul>
                                </div>
                                <OrdersTable :orders="block.orders" :loading="false" />
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Nómina / quincena -->
            <div v-show="activeTab === 'payroll' && detail" class="space-y-4 min-h-[200px]">
                <UserPayrollInsightsPanel
                    v-if="payrollUserId"
                    :key="payrollUserId"
                    :user-id="payrollUserId"
                    @payroll-saved="emit('payroll-saved')" />
            </div>
        </div>

        <div v-else class="flex justify-center items-center py-12">
            <BaseLoading size="lg" />
        </div>

        <template #footer>
            <BaseButton @click="$emit('close')" variant="secondary">
                Cerrar
            </BaseButton>
            <BaseButton v-if="showLiquidationButton && activeTab !== 'payroll'"
                type="button" @click="emit('open-liquidation')" variant="success" :loading="loading">
                Liquidar ({{ formatCurrency(detail!.currentBalance) }})
            </BaseButton>
            <p v-else-if="activeTab === 'cycle' && detail && detail.ordersOnTheWayCount && detail.ordersOnTheWayCount > 0"
                class="text-xs text-amber-800 mr-auto max-w-md">
                No se puede liquidar: hay {{ detail.ordersOnTheWayCount }} pedido(s) en camino. Entréguelos primero.
            </p>
            <p v-else-if="activeTab === 'cycle' && detail && !liquidationAllowedForSelectedDate"
                class="text-xs text-gray-600 mr-auto max-w-md">
                La liquidación solo está disponible cuando consultas el día de hoy.
            </p>
            <p v-else-if="activeTab === 'cycle' && detail?.dayBlocked" class="text-xs text-amber-800 mr-auto">
                Domiciliario liquidado hoy. Desbloquea desde la tarjeta si necesitas operar de nuevo.
            </p>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { defaultBusinessCalendar } from '@/utils/datetime'
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
import UserPayrollInsightsPanel from '@/components/users/UserPayrollInsightsPanel.vue'
import { useAuthStore } from '@/store/auth'

interface Props {
    isOpen: boolean
    detail: DeliverymanDetail | null
    loading?: boolean
    /** False si la fecha seleccionada en la vista no es “hoy” (Colombia): no se debe liquidar desde ese detalle. */
    liquidationAllowedForSelectedDate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    liquidationAllowedForSelectedDate: true,
})
const emit = defineEmits<{
    'close': []
    'open-liquidation': []
    'payroll-saved': []
}>()

const authStore = useAuthStore()
const showPayrollTab = computed(
    () => authStore.user?.role === 'Admin' || authStore.user?.role === 'Superadmin'
)
const payrollUserId = computed(() => props.detail?.deliverymanId ?? 0)

const { formatCurrency } = useFormatting()

const activeTab = ref<'cycle' | 'fullday' | 'payroll'>('cycle')
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

/** Solo hora (el modal ya está filtrado por fecha). */
function formatColTime(iso: string | null | undefined): string {
    if (!iso) return '—'
    return defaultBusinessCalendar.formatTime(iso)
}

/** Diferencia real vs meta (segundos). */
function formatVarianceLine(sec: number | null | undefined): string {
    if (sec == null) return 'Diferencia vs plan: —'
    if (sec === 0) return 'Diferencia vs plan: en tiempo con la meta'
    const sign = sec > 0 ? '+' : '−'
    const totalSec = Math.abs(sec)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    const qty =
        m > 0 ? (s ? `${sign}${m} min ${s} s` : `${sign}${m} min`) : `${sign}${s} s`
    const tail = sec > 0 ? ' (más lento que lo planeado)' : ' (más rápido que lo planeado)'
    return `Diferencia vs plan: ${qty}${tail}`
}

function buildRouteScheduleLines(s: DeliverymanRouteSummaryItem): string[] {
    return [
        `Salida: ${formatColTime(s.routeStartedAtUtc)}`,
        `Fin de ruta (plan): ${formatColTime(s.plannedEndAtUtc)}`,
        `Finalización real: ${formatColTime(s.completedAtUtc)}`,
        formatVarianceLine(s.varianceSeconds),
    ]
}

function buildRouteOrderBlocks(
    orders: OrderListItem[],
    routeStats: DeliverymanRouteDayStats | undefined
): { key: string; title: string; subtitle: string; scheduleLines?: string[]; orders: OrderListItem[] }[] {
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

    const blocks: {
        key: string
        title: string
        subtitle: string
        scheduleLines?: string[]
        orders: OrderListItem[]
    }[] = []
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
            const when = s?.completedAtUtc ? formatColTime(s.completedAtUtc) : null
            blocks.push({
                key: k,
                title: `Ruta #${id}`,
                subtitle: [km ? `${km} (planeada + regreso)` : null, when ? `Cerrada ${when}` : null]
                    .filter(Boolean)
                    .join(' · '),
                scheduleLines: s ? buildRouteScheduleLines(s) : undefined,
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

const showLiquidationButton = computed(
    () =>
        canOpenLiquidation.value &&
        props.liquidationAllowedForSelectedDate &&
        activeTab.value === 'cycle'
)

</script>
