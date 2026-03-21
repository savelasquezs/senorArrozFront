<template>
    <div class="space-y-6">
        <!-- KPIs (datos de ejemplo hasta conectar API) -->
        <div
            class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6"
        >
            <DashboardKpiCard
                title="Ventas totales"
                :value="kpis.totalSales"
                format="currency"
                :week-change-percent="kpis.totalSalesWeekChangePercent"
                :year-change-percent="kpis.totalSalesYearChangePercent"
                icon="currency"
            />
            <DashboardKpiCard
                title="Pedidos"
                :value="kpis.ordersCount"
                format="number"
                :week-change-percent="kpis.ordersWeekChangePercent"
                :year-change-percent="kpis.ordersYearChangePercent"
                icon="orders"
            />
            <DashboardKpiCard
                title="Ticket promedio"
                :value="kpis.avgTicket"
                format="currency"
                :week-change-percent="kpis.avgTicketWeekChangePercent"
                :year-change-percent="kpis.avgTicketYearChangePercent"
                icon="store"
            />
            <DashboardKpiCard
                title="% cancelaciones"
                :value="kpis.cancellationRate"
                format="percent"
                :week-change-percent="kpis.cancellationRateWeekChangePercent"
                :year-change-percent="kpis.cancellationRateYearChangePercent"
                :higher-is-better="false"
                icon="chart"
            />
        </div>

        <BaseCard title="Estados de pedidos (ahora)" :padding="'md'">
            <p class="text-xs text-gray-500 mb-4">
                Pipeline en curso: Tomado → En preparación → Listo → En camino. El bloque con más pedidos
                sugiere dónde mirar primero.
            </p>
            <DashboardOrderStatusKanban :counts="pipelineCounts" />
        </BaseCard>

        <!-- Superadmin: competencia entre sucursales (ver DASHBOARD_VISIBILITY / no Admin) -->
        <BranchComparisonPanel :rows="branchComparisonRows" />

        <TimeEvolutionPanel
            v-model:date-range="evolutionDateRange"
            :sales-by-day="salesByDay"
            :sales-by-hour="salesByHour"
            :sales-by-month="salesByMonth"
            :sales-by-year="salesByYear"
            :orders-by-day="ordersByDay"
            :orders-by-hour="ordersByHour"
            :orders-by-month="ordersByMonth"
            :orders-by-year="ordersByYear"
        />

        <OperationOverviewPanel
            v-model:period="deliveryPeriod"
            v-model:branch-id="deliveryBranchId"
            v-model:delivery-evolution-driver-id="deliveryEvolutionDriverId"
            :branch-options="deliveryBranchOptions"
            :avg-prep-minutes="avgPrepMinutes"
            :avg-delivery-minutes="avgDeliveryMinutes"
            :deliverymen="filteredDeliverymenEfficiency"
            :evolution-labels="deliveryEvolutionBundle.labels"
            :evolution-data="deliveryEvolutionDeliveriesScaled"
            :evolution-fee-data="deliveryEvolutionFeesScaled"
        />

        <BaseCard title="Pedidos por estado" class="col-span-1">
            <div class="h-64 sm:h-80">
                <div class="flex items-center justify-center h-full text-gray-500 text-sm">
                    Gráfico pendiente (Chart.js)
                </div>
            </div>
        </BaseCard>

        <!-- Recent Activity -->
        <BaseCard title="Actividad Reciente">
            <div class="space-y-4">
                <div v-for="activity in recentActivity" :key="activity.id"
                    class="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-0">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <component :is="getActivityIcon(activity.type)" class="w-4 h-4 text-orange-600" />
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900">{{ activity.description }}</p>
                        <p class="text-sm text-gray-500">{{ formatDate(activity.timestamp) }}</p>
                    </div>
                    <div class="text-sm text-gray-500">
                        {{ activity.branch }}
                    </div>
                </div>
            </div>
        </BaseCard>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import {
    DashboardKpiCard,
    DashboardOrderStatusKanban,
    BranchComparisonPanel,
    TimeEvolutionPanel,
    OperationOverviewPanel,
    getBranchSeriesColor,
    defaultDateRangeLastDays,
    daysInclusive,
    monthsInclusive,
    yearsInclusive,
    type BranchComparisonRow,
    type SalesTimeSeriesBlock,
    type OrdersPerHourBlock,
    type OrderPipelineStatusCounts,
    type DeliverymanEfficiencyRow,
    type DeliveryBranchOption,
} from '@/components/dashboard'
import { defaultDashboardPeriodThisMonth } from '@/utils/dashboardPeriodPresets'
import type { DashboardPeriodValue } from '@/utils/dashboardPeriodPresets'
import { buildDeliveryEvolutionBundle, scaleSeriesToTargetSum } from '@/utils/deliveryEvolutionSeries'
import { ClipboardDocumentListIcon, CurrencyDollarIcon, UsersIcon } from '@heroicons/vue/24/outline'

/** Placeholder; reemplazar con respuesta del API */
const kpis = ref({
    totalSales: 2_500_000,
    totalSalesWeekChangePercent: 5.2,
    totalSalesYearChangePercent: 12.4,
    ordersCount: 145,
    ordersWeekChangePercent: 8.0,
    ordersYearChangePercent: -1.5,
    avgTicket: 17_241,
    avgTicketWeekChangePercent: 3.4,
    avgTicketYearChangePercent: 6.2,
    cancellationRate: 2.1,
    cancellationRateWeekChangePercent: -0.8,
    cancellationRateYearChangePercent: 0.3,
})

/** Mock comparación sucursales; sustituir por GET /api/dashboard/... */
const branchComparisonRows = ref<BranchComparisonRow[]>([
    {
        id: 1,
        name: 'Santander',
        salesTotal: 2_850_000,
        ordersTotal: 162,
        salesDelivery: 1_920_000,
        salesOnsite: 930_000,
        ordersDelivery: 108,
        ordersOnsite: 54,
        deliveryTimeMinutes: 34,
    },
    {
        id: 2,
        name: 'Centro',
        salesTotal: 2_100_000,
        ordersTotal: 131,
        salesDelivery: 1_450_000,
        salesOnsite: 650_000,
        ordersDelivery: 89,
        ordersOnsite: 42,
        deliveryTimeMinutes: 41,
    },
    {
        id: 3,
        name: 'Norte',
        salesTotal: 1_680_000,
        ordersTotal: 98,
        salesDelivery: 1_100_000,
        salesOnsite: 580_000,
        ordersDelivery: 62,
        ordersOnsite: 36,
        deliveryTimeMinutes: 52,
    },
    {
        id: 4,
        name: 'Manrique',
        salesTotal: 1_420_000,
        ordersTotal: 88,
        salesDelivery: 980_000,
        salesOnsite: 440_000,
        ordersDelivery: 55,
        ordersOnsite: 33,
        deliveryTimeMinutes: 39,
    },
])

/** Rango que alimenta ventas por día y el día “activo” para vistas por hora (mock). */
const evolutionDateRange = ref<[Date, Date]>(defaultDateRangeLastDays(7))

/** Pipeline operativo (mock; conectar SignalR / polling). */
const pipelineCounts = ref<OrderPipelineStatusCounts>({
    taken: 14,
    in_preparation: 11,
    ready: 7,
    on_the_way: 18,
})

/** Periodo para eficiencia domiciliarios + evolución (presets en `dashboardPeriodPresets.ts`). */
const deliveryPeriod = ref<DashboardPeriodValue>(defaultDashboardPeriodThisMonth())

/** Filtro de sucursal para todo el bloque de domiciliarios (`null` = todas). */
const deliveryBranchId = ref<number | null>(null)

/** Filtro solo para la gráfica de línea “Entregas completadas” (reacta a sucursal). */
const deliveryEvolutionDriverId = ref<number | 'all'>('all')

watch(deliveryBranchId, () => {
    deliveryEvolutionDriverId.value = 'all'
})

const deliveryBranchOptions = computed<DeliveryBranchOption[]>(() =>
    branchComparisonRows.value.map((b) => ({ id: b.id, name: b.name })),
)

/**
 * Mock: `branchId` alineado con `branchComparisonRows`. Sustituir por API
 * GET .../deliverymen?branchId=&from=&to=.
 */
const BASE_DELIVERYMEN: DeliverymanEfficiencyRow[] = [
    { id: 1, branchId: 1, name: 'Carlos R.', deliveredCount: 32, avgDeliveryMinutes: 33, deliveryFeeTotal: 185_000 },
    { id: 2, branchId: 1, name: 'María L.', deliveredCount: 28, avgDeliveryMinutes: 38, deliveryFeeTotal: 162_000 },
    { id: 3, branchId: 2, name: 'Andrés V.', deliveredCount: 22, avgDeliveryMinutes: 44, deliveryFeeTotal: 128_000 },
    { id: 4, branchId: 2, name: 'Laura M.', deliveredCount: 19, avgDeliveryMinutes: 29, deliveryFeeTotal: 108_000 },
    { id: 5, branchId: 3, name: 'Diego S.', deliveredCount: 15, avgDeliveryMinutes: 52, deliveryFeeTotal: 89_000 },
    { id: 6, branchId: 3, name: 'Paola T.', deliveredCount: 24, avgDeliveryMinutes: 31, deliveryFeeTotal: 142_000 },
    { id: 7, branchId: 4, name: 'Julián M.', deliveredCount: 26, avgDeliveryMinutes: 36, deliveryFeeTotal: 152_000 },
    { id: 8, branchId: 4, name: 'Sandra K.', deliveredCount: 21, avgDeliveryMinutes: 40, deliveryFeeTotal: 118_000 },
]

const deliveryEvolutionBundle = computed(() =>
    buildDeliveryEvolutionBundle(deliveryPeriod.value.range),
)

const scaledDeliverymenAll = computed<DeliverymanEfficiencyRow[]>(() => {
    const [from, to] = deliveryPeriod.value.range
    const seed =
        Math.abs(Math.floor(from.getTime() / 86400000) + Math.floor(to.getTime() / 86400000)) % 97
    return BASE_DELIVERYMEN.map((row, i) => {
        const mult = 0.62 + ((seed + i * 7) % 38) / 100
        const deliveredCount = Math.max(3, Math.round(row.deliveredCount * mult))
        const feeRatio = deliveredCount / Math.max(1, row.deliveredCount)
        return {
            ...row,
            deliveredCount,
            deliveryFeeTotal: Math.round(row.deliveryFeeTotal * feeRatio * (0.92 + ((seed + i) % 15) / 100)),
            avgDeliveryMinutes: Math.min(
                56,
                Math.max(24, Math.round(row.avgDeliveryMinutes + ((seed + i * 3) % 13) - 6)),
            ),
        }
    })
})

const filteredDeliverymenEfficiency = computed(() => {
    const bid = deliveryBranchId.value
    if (bid == null) return scaledDeliverymenAll.value
    return scaledDeliverymenAll.value.filter((d) => d.branchId === bid)
})

watch(
    filteredDeliverymenEfficiency,
    (rows) => {
        const sel = deliveryEvolutionDriverId.value
        if (sel !== 'all' && !rows.some((d) => d.id === sel)) {
            deliveryEvolutionDriverId.value = 'all'
        }
    },
    { deep: true },
)

/** Objetivo de suma para la serie de entregas (toda la sucursal o un domiciliario). */
const deliveryEvolutionDeliveriesTargetSum = computed(() => {
    const rows = filteredDeliverymenEfficiency.value
    const sel = deliveryEvolutionDriverId.value
    if (sel !== 'all') {
        const one = rows.find((d) => d.id === sel)
        return one ? one.deliveredCount : 0
    }
    return rows.reduce((s, d) => s + d.deliveredCount, 0)
})

const deliveryEvolutionFeesTargetSum = computed(() =>
    filteredDeliverymenEfficiency.value.reduce((s, d) => s + d.deliveryFeeTotal, 0),
)

const deliveryEvolutionDeliveriesScaled = computed(() =>
    scaleSeriesToTargetSum(
        deliveryEvolutionBundle.value.deliveries,
        deliveryEvolutionDeliveriesTargetSum.value,
    ),
)

const deliveryEvolutionFeesScaled = computed(() =>
    scaleSeriesToTargetSum(
        deliveryEvolutionBundle.value.feesTotal,
        deliveryEvolutionFeesTargetSum.value,
    ),
)

const avgPrepMinutes = computed(() => {
    const s = Math.abs(Math.floor(deliveryPeriod.value.range[0].getTime() / 86400000)) % 40
    let v = 22 + s * 0.35
    const bid = deliveryBranchId.value
    if (bid != null) v += (bid * 1.7) % 4.5
    return Math.round(v * 10) / 10
})

const avgDeliveryMinutes = computed(() => {
    const s = Math.abs(Math.floor(deliveryPeriod.value.range[1].getTime() / 86400000)) % 50
    let v = 34 + s * 0.42
    const bid = deliveryBranchId.value
    if (bid != null) v += (bid * 2.1) % 5
    return Math.round(v * 10) / 10
})

const HOUR_SLOTS = 14
const hourLabels = Array.from({ length: HOUR_SLOTS }, (_, i) => {
    const h = 8 + i
    return `${String(h).padStart(2, '0')}:00`
})

function mockSalesSeries(len: number, seed: number) {
    return Array.from({ length: len }, (_, i) =>
        Math.max(
            80_000,
            Math.round(
                150_000 + seed * 40_000 + Math.sin(i * 0.85 + seed) * 90_000 + i * 18_000,
            ),
        ),
    )
}

function mockSalesSeriesScaled(len: number, seed: number, multiplier: number) {
    return mockSalesSeries(len, seed).map((v) => Math.round(v * multiplier))
}

function mockOrderCounts(len: number, seed: number) {
    return Array.from({ length: len }, (_, i) =>
        Math.max(
            1,
            Math.round(
                8 + (seed % 7) * 2 + Math.sin(i * 0.65 + seed * 0.1) * 14 + i * 1.5,
            ),
        ),
    )
}

const salesByDay = computed<SalesTimeSeriesBlock>(() => {
    const [from, to] = evolutionDateRange.value
    const dayList = daysInclusive(from, to, 62)
    const labels = dayList.map((d: Date) =>
        d.toLocaleDateString('es-CO', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        }),
    )
    const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97)
    const names = branchComparisonRows.value.map((b) => b.name)
    return {
        labels,
        datasets: names.map((label, i) => {
            const c = getBranchSeriesColor(i)
            return {
                label,
                data: mockSalesSeries(labels.length, i + 1 + seedBase / 10),
                borderColor: c.border,
                backgroundColor: c.area,
            }
        }),
    }
})

const salesByHour = computed<SalesTimeSeriesBlock>(() => {
    const [, to] = evolutionDateRange.value
    const daySeed = Math.abs(Math.floor(to.getTime() / 86400000) % 97)
    const names = branchComparisonRows.value.map((b) => b.name)
    return {
        labels: hourLabels,
        datasets: names.map((label, i) => {
            const c = getBranchSeriesColor(i)
            return {
                label,
                data: mockSalesSeries(HOUR_SLOTS, i + 3 + daySeed / 10),
                borderColor: c.border,
                backgroundColor: c.area,
            }
        }),
    }
})

const salesByMonth = computed<SalesTimeSeriesBlock>(() => {
    const [from, to] = evolutionDateRange.value
    const months = monthsInclusive(from, to, 36)
    const labels = months.map((d: Date) =>
        d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
    )
    const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97)
    const names = branchComparisonRows.value.map((b) => b.name)
    return {
        labels,
        datasets: names.map((label, i) => {
            const c = getBranchSeriesColor(i)
            return {
                label,
                data: mockSalesSeriesScaled(labels.length, i + 2 + seedBase / 12, 22),
                borderColor: c.border,
                backgroundColor: c.area,
            }
        }),
    }
})

const salesByYear = computed<SalesTimeSeriesBlock>(() => {
    const [from, to] = evolutionDateRange.value
    const yrs = yearsInclusive(from, to, 20)
    const labels = yrs.map((y) => String(y))
    const seedBase = Math.abs(from.getFullYear() * 13 + to.getFullYear()) % 97
    const names = branchComparisonRows.value.map((b) => b.name)
    return {
        labels,
        datasets: names.map((label, i) => {
            const c = getBranchSeriesColor(i)
            return {
                label,
                data: mockSalesSeriesScaled(labels.length, i + 5 + seedBase / 15, 320),
                borderColor: c.border,
                backgroundColor: c.area,
            }
        }),
    }
})

const ordersByDay = computed<OrdersPerHourBlock>(() => {
    const [from, to] = evolutionDateRange.value
    const dayList = daysInclusive(from, to, 62)
    const labels = dayList.map((d: Date) =>
        d.toLocaleDateString('es-CO', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        }),
    )
    const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97)
    return {
        labels,
        counts: mockOrderCounts(labels.length, seedBase + 11),
    }
})

const ordersByHour = computed<OrdersPerHourBlock>(() => {
    const [, to] = evolutionDateRange.value
    const daySeed = Math.abs(Math.floor(to.getTime() / 86400000) % 97)
    return {
        labels: hourLabels,
        counts: Array.from({ length: HOUR_SLOTS }, (_, i) =>
            Math.round(
                5 +
                    i * 0.7 +
                    Math.sin(i * 0.45 + daySeed / 20) * 7 +
                    (i >= 5 && i <= 9 ? 12 : 0),
            ),
        ),
    }
})

const ordersByMonth = computed<OrdersPerHourBlock>(() => {
    const [from, to] = evolutionDateRange.value
    const months = monthsInclusive(from, to, 36)
    const labels = months.map((d: Date) =>
        d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
    )
    const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97)
    return {
        labels,
        counts: mockOrderCounts(labels.length, seedBase + 33).map((n) =>
            Math.round(n * 18),
        ),
    }
})

const ordersByYear = computed<OrdersPerHourBlock>(() => {
    const [from, to] = evolutionDateRange.value
    const yrs = yearsInclusive(from, to, 20)
    const labels = yrs.map((y) => String(y))
    const seedBase = Math.abs(from.getFullYear() * 11 + to.getFullYear()) % 97
    return {
        labels,
        counts: mockOrderCounts(labels.length, seedBase + 55).map((n) =>
            Math.round(n * 220),
        ),
    }
})

const recentActivity = ref([
    {
        id: 1,
        type: 'order',
        description: 'Nuevo pedido #1234 creado',
        timestamp: new Date(Date.now() - 5 * 60000),
        branch: 'Sucursal Centro'
    },
    {
        id: 2,
        type: 'user',
        description: 'Usuario Juan Pérez inició sesión',
        timestamp: new Date(Date.now() - 15 * 60000),
        branch: 'Sucursal Norte'
    },
    {
        id: 3,
        type: 'payment',
        description: 'Pago de $85.000 confirmado',
        timestamp: new Date(Date.now() - 30 * 60000),
        branch: 'Sucursal Sur'
    }
])

const getActivityIcon = (type: string) => {
    const icons = {
        order: ClipboardDocumentListIcon,
        user: UsersIcon,
        payment: CurrencyDollarIcon
    }
    return icons[type as keyof typeof icons] || ClipboardDocumentListIcon
}

const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Hace un momento'
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`

    return date.toLocaleDateString()
}

onMounted(() => {
    // Load dashboard data
    // fetchStats()
    // fetchRecentActivity()
})
</script>