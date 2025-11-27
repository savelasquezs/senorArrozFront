<template>
    <MainLayout>
        <div class="p-6 space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Gestión de Domiciliarios</h1>
                    <p class="text-sm text-gray-500 mt-1">Control de efectivo y abonos del día</p>
                </div>
                
                <!-- Filtro de fecha -->
                <div class="flex items-center gap-3">
                    <BaseInput
                        v-model="selectedDate"
                        type="date"
                        @change="loadData"
                        class="w-48"
                    />
                    <BaseButton @click="loadData" variant="outline" size="sm" :loading="loading">
                        <ArrowPathIcon class="w-4 h-4" />
                    </BaseButton>
                </div>
            </div>

            <!-- Layout 50/50 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Izquierda: Cards de domiciliarios -->
                <div>
                    <h2 class="text-lg font-semibold text-gray-900 mb-4">
                        Domiciliarios activos ({{ deliverymenStats.length }})
                    </h2>
                    
                    <div v-if="loading" class="grid grid-cols-1 gap-4">
                        <div v-for="i in 3" :key="i" class="bg-gray-100 animate-pulse rounded-lg h-64"></div>
                    </div>

                    <div v-else-if="deliverymenStats.length > 0" class="grid grid-cols-1 gap-4">
                        <DeliverymanCard
                            v-for="stat in deliverymenStats"
                            :key="stat.deliverymanId"
                            :stats="stat"
                            @view-detail="handleViewDetail"
                            @base-amount-changed="handleBaseAmountChanged"
                        />
                    </div>

                    <div v-else class="bg-gray-50 rounded-lg p-12 text-center">
                        <TruckIcon class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p class="text-gray-500">No hay domiciliarios con pedidos entregados hoy</p>
                    </div>
                </div>

                <!-- Derecha: Tabla de abonos -->
                <div>
                    <AdvancesTable
                        :advances="advances"
                        @create-advance="openAdvanceForm()"
                        @edit-advance="openAdvanceForm"
                        @delete-advance="handleDeleteAdvance"
                    />
                </div>
            </div>
        </div>

        <!-- Modales -->
        <AdvanceForm
            :is-open="showAdvanceForm"
            :deliverymen="deliverymenStats"
            :editing-advance="editingAdvance"
            :loading="submitting"
            @close="closeAdvanceForm"
            @submit="handleSubmitAdvance"
        />

        <DeliverymanDetailModal
            :is-open="showDetailModal"
            :detail="selectedDeliverymanDetail"
            :loading="loadingDetail"
            @close="closeDetailModal"
            @liquidate="handleLiquidate"
        />

        <LiquidationConfirmModal
            :is-open="showLiquidationModal"
            :deliveryman-name="liquidatedDeliveryman?.name || ''"
            :amount="liquidatedDeliveryman?.amount || 0"
            :base-amount="liquidatedDeliveryman?.baseAmount || 0"
            @close="closeLiquidationModal"
            @go-to-expenses="goToExpenses"
        />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { useDeliverymanStats } from '@/composables/useDeliverymanStats'
import { userApi } from '@/services/MainAPI/userApi'
import { orderApi } from '@/services/MainAPI/orderApi'
import { deliverymanApi } from '@/services/MainAPI/deliverymanApi'
import type { DeliverymanStats, DeliverymanAdvance, DeliverymanDetail } from '@/types/deliveryman'
import type { OrderListItem } from '@/types/order'
import type { User } from '@/types/user'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DeliverymanCard from '@/components/deliverymen/DeliverymanCard.vue'
import AdvancesTable from '@/components/deliverymen/AdvancesTable.vue'
import AdvanceForm from '@/components/deliverymen/AdvanceForm.vue'
import DeliverymanDetailModal from '@/components/deliverymen/DeliverymanDetailModal.vue'
import LiquidationConfirmModal from '@/components/deliverymen/LiquidationConfirmModal.vue'
import { ArrowPathIcon, TruckIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const { success, error } = useToast()
const { calculateStats } = useDeliverymanStats()

// Estado
const selectedDate = ref(new Date().toISOString().split('T')[0])
const loading = ref(false)
const submitting = ref(false)
const loadingDetail = ref(false)

const deliverymen = ref<User[]>([])
const deliverymenOrders = ref<Map<number, OrderListItem[]>>(new Map())
const deliverymenAdvances = ref<Map<number, number>>(new Map())
const advances = ref<DeliverymanAdvance[]>([])
const baseAmounts = ref<Map<number, number>>(new Map())

// Modales
const showAdvanceForm = ref(false)
const showDetailModal = ref(false)
const showLiquidationModal = ref(false)
const editingAdvance = ref<DeliverymanAdvance | null>(null)
const selectedDeliverymanDetail = ref<DeliverymanDetail | null>(null)
const liquidatedDeliveryman = ref<{ name: string; amount: number; baseAmount: number } | null>(null)

// Computed
const deliverymenStats = computed((): DeliverymanStats[] => {
    return deliverymen.value
        .map(dm => {
            const orders = deliverymenOrders.value.get(dm.id) || []
            const totalAdvances = deliverymenAdvances.value.get(dm.id) || 0
            const baseAmount = baseAmounts.value.get(dm.id) || 55000
            
            return calculateStats(dm.id, dm.name, orders, totalAdvances, baseAmount)
        })
        .filter(stat => stat.ordersCount > 0) // Solo mostrar domiciliarios con pedidos entregados
})

// Cargar datos
const loadData = async () => {
    loading.value = true
    try {
        await Promise.all([
            loadDeliverymen(),
            loadAdvances()
        ])
    } catch (err: any) {
        error('Error al cargar datos', err.message)
    } finally {
        loading.value = false
    }
}

const loadDeliverymen = async () => {
    // Obtener domiciliarios activos
    const result = await userApi.getUsers({
        role: 'Deliveryman',
        active: true,
        branchId: authStore.user?.branchId
    })
    
    deliverymen.value = result.items

    // Cargar pedidos y abonos para cada domiciliario
    const dateStart = new Date(selectedDate.value)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(selectedDate.value)
    dateEnd.setHours(23, 59, 59, 999)

    for (const dm of deliverymen.value) {
        // Cargar pedidos delivered del día
        const ordersResult = await orderApi.searchOrders({
            deliveryManId: dm.id,
            status: 'delivered',
            type: 'delivery',
            fromDate: dateStart.toISOString(),
            toDate: dateEnd.toISOString(),
            pageSize: 100
        })
        
        deliverymenOrders.value.set(dm.id, ordersResult.items)

        // Cargar total de abonos del día
        const advancesResult = await deliverymanApi.getAdvances({
            deliverymanId: dm.id,
            fromDate: dateStart.toISOString(),
            toDate: dateEnd.toISOString(),
            pageSize: 100
        })
        
        const totalAdvances = advancesResult.items.reduce((sum, adv) => sum + adv.amount, 0)
        deliverymenAdvances.value.set(dm.id, totalAdvances)
    }
}

const loadAdvances = async () => {
    const dateStart = new Date(selectedDate.value)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(selectedDate.value)
    dateEnd.setHours(23, 59, 59, 999)

    const result = await deliverymanApi.getAdvances({
        fromDate: dateStart.toISOString(),
        toDate: dateEnd.toISOString(),
        pageSize: 100
    })
    
    advances.value = result.items
}

// Handlers de card
const handleViewDetail = async (deliverymanId: number) => {
    loadingDetail.value = true
    showDetailModal.value = true
    
    try {
        const stat = deliverymenStats.value.find(s => s.deliverymanId === deliverymanId)
        if (!stat) return

        const orders = deliverymenOrders.value.get(deliverymanId) || []
        
        selectedDeliverymanDetail.value = {
            ...stat,
            orders
        }
    } catch (err: any) {
        error('Error al cargar detalle', err.message)
        showDetailModal.value = false
    } finally {
        loadingDetail.value = false
    }
}

const handleBaseAmountChanged = (deliverymanId: number, amount: number) => {
    baseAmounts.value.set(deliverymanId, amount)
}

// Handlers de abonos
const openAdvanceForm = (advance?: DeliverymanAdvance) => {
    editingAdvance.value = advance || null
    showAdvanceForm.value = true
}

const closeAdvanceForm = () => {
    showAdvanceForm.value = false
    editingAdvance.value = null
}

const handleSubmitAdvance = async (data: { deliverymanId: number; amount: number; notes?: string }) => {
    submitting.value = true
    try {
        if (editingAdvance.value) {
            // Actualizar
            await deliverymanApi.updateAdvance(data.deliverymanId, editingAdvance.value.id, {
                amount: data.amount,
                notes: data.notes
            })
            success('Abono actualizado', 5000)
        } else {
            // Crear
            await deliverymanApi.createAdvance(data.deliverymanId, data)
            success('Abono creado', 5000)
        }
        
        closeAdvanceForm()
        await loadData()
    } catch (err: any) {
        error('Error al guardar abono', err.message)
    } finally {
        submitting.value = false
    }
}

const handleDeleteAdvance = async (advance: DeliverymanAdvance) => {
    try {
        await deliverymanApi.deleteAdvance(advance.deliverymanId, advance.id)
        success('Abono eliminado', 5000)
        await loadData()
    } catch (err: any) {
        error('Error al eliminar abono', err.message)
    }
}

// Handler de liquidación
const handleLiquidate = async (deliverymanId: number, amount: number) => {
    submitting.value = true
    try {
        const stat = deliverymenStats.value.find(s => s.deliverymanId === deliverymanId)
        if (!stat) return

        await deliverymanApi.createAdvance(deliverymanId, {
            deliverymanId,
            amount,
            notes: 'Liquidación automática'
        })

        liquidatedDeliveryman.value = {
            name: stat.deliverymanName,
            amount,
            baseAmount: stat.baseAmount
        }

        closeDetailModal()
        showLiquidationModal.value = true
        await loadData()
    } catch (err: any) {
        error('Error al liquidar', err.message)
    } finally {
        submitting.value = false
    }
}

const closeDetailModal = () => {
    showDetailModal.value = false
    selectedDeliverymanDetail.value = null
}

const closeLiquidationModal = () => {
    showLiquidationModal.value = false
    liquidatedDeliveryman.value = null
}

const goToExpenses = () => {
    closeLiquidationModal()
    router.push('/expenses')
}

onMounted(() => {
    // Verificar permisos
    if (authStore.userRole !== 'Admin' && authStore.userRole !== 'Cashier' && authStore.userRole !== 'Superadmin') {
        router.push('/')
        return
    }

    loadData()
})
</script>

