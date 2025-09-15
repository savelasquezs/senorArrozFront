<template>
    <div class="space-y-6">
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Ventas Hoy" :value="stats.todaySales" format="currency" icon="CurrencyDollarIcon"
                trend="+12%" trend-direction="up" />
            <StatsCard title="Pedidos Totales" :value="stats.totalOrders" format="number"
                icon="ClipboardDocumentListIcon" trend="+8%" trend-direction="up" />
            <StatsCard title="Sucursales Activas" :value="stats.activeBranches" format="number"
                icon="BuildingStorefrontIcon" />
            <StatsCard title="Usuarios Conectados" :value="stats.activeUsers" format="number" icon="UsersIcon" />
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
import StatsCard from '@/components/ui/StatsCard.vue'
import { ClipboardDocumentListIcon, CurrencyDollarIcon, UsersIcon, BuildingStorefrontIcon } from '@heroicons/vue/24/outline'

const stats = ref({
    todaySales: 2500000,
    totalOrders: 145,
    activeBranches: 3,
    activeUsers: 8
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