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

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BaseCard title="Ventas por Sucursal" class="col-span-1">
                <div class="h-80">
                    <!-- Chart component will go here -->
                    <div class="flex items-center justify-center h-full text-gray-500">
                        Gráfico de ventas por sucursal
                    </div>
                </div>
            </BaseCard>

            <BaseCard title="Pedidos por Estado" class="col-span-1">
                <div class="h-80">
                    <!-- Chart component will go here -->
                    <div class="flex items-center justify-center h-full text-gray-500">
                        Gráfico de pedidos por estado
                    </div>
                </div>
            </BaseCard>
        </div>

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
import { ref, onMounted } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import { DashboardKpiCard } from '@/components/dashboard'
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