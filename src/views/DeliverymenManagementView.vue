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
                            @orders-click="handleOrdersClick"
                            @base-amount-changed="handleBaseAmountChanged"
                            @unlock-day="handleUnlockDay"
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
            @open-liquidation="openLiquidationWizard"
        />

        <LiquidationWizardModal
            v-model="showLiquidationWizard"
            :detail="selectedDeliverymanDetail"
            :selected-date="selectedDate"
            :bank-options="bankOptions"
            @success="handleSettleSuccess"
        />

        <LiquidationConfirmModal
            :is-open="showLiquidationModal"
            :deliveryman-name="liquidatedDeliveryman?.name || ''"
            :amount="liquidatedDeliveryman?.amount || 0"
            :base-amount="liquidatedDeliveryman?.baseAmount || 0"
            @close="closeLiquidationModal"
            @go-to-expenses="goToExpenses"
        />

        <DeliverymanOrdersModal
            :is-open="showOrdersModal"
            :deliveryman-id="ordersModalDeliveryman?.id ?? null"
            :deliveryman-name="ordersModalDeliveryman?.name || ''"
            :selected-date="selectedDate"
            @close="closeOrdersModal"
        />
    </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import { deliverymanApi } from '@/services/MainAPI/deliverymanApi'
import type { DeliverymanStats, DeliverymanAdvance, DeliverymanDetail, SettleDeliverymanDayResultDto } from '@/types/deliveryman'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import MainLayout from '@/components/layout/MainLayout.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DeliverymanCard from '@/components/deliverymen/DeliverymanCard.vue'
import AdvancesTable from '@/components/deliverymen/AdvancesTable.vue'
import AdvanceForm from '@/components/deliverymen/AdvanceForm.vue'
import DeliverymanDetailModal from '@/components/deliverymen/DeliverymanDetailModal.vue'
import LiquidationWizardModal from '@/components/deliverymen/LiquidationWizardModal.vue'
import LiquidationConfirmModal from '@/components/deliverymen/LiquidationConfirmModal.vue'
import DeliverymanOrdersModal from '@/components/deliverymen/DeliverymanOrdersModal.vue'
import { ArrowPathIcon, TruckIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()
const { success, error } = useToast()

// Estado
// Fecha de hoy en zona Colombia (evitar desfase por UTC)
const selectedDate = ref(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }))
const loading = ref(false)
const submitting = ref(false)
const loadingDetail = ref(false)

const deliverymenStatsRaw = ref<DeliverymanStats[]>([])
const advances = ref<DeliverymanAdvance[]>([])
const baseAmounts = ref<Map<number, number>>(new Map())

// Modales
const showAdvanceForm = ref(false)
const showDetailModal = ref(false)
const showOrdersModal = ref(false)
const showLiquidationModal = ref(false)
const showLiquidationWizard = ref(false)
const ordersModalDeliveryman = ref<{ id: number; name: string } | null>(null)
const editingAdvance = ref<DeliverymanAdvance | null>(null)
const selectedDeliverymanDetail = ref<DeliverymanDetail | null>(null)
const liquidatedDeliveryman = ref<{ name: string; amount: number; baseAmount: number } | null>(null)

const ordersDraftsStore = useOrdersDraftsStore()

const bankOptions = computed(() =>
    ordersDraftsStore.banks
        .filter((b) => b.active)
        .map((b) => ({ value: b.id, label: b.name }))
)

// Computed: aplicar overrides de baseAmount locales
const deliverymenStats = computed((): DeliverymanStats[] => {
    return deliverymenStatsRaw.value.map(stat => {
        const overrideBase = baseAmounts.value.get(stat.deliverymanId)
        const baseAmount = overrideBase ?? stat.baseAmount
        const currentBalance = stat.totalCash + baseAmount - stat.totalAdvances
        return { ...stat, baseAmount, currentBalance }
    })
})

// Cargar datos: una sola llamada a getDailyOverview
const loadData = async () => {
    loading.value = true
    try {
        const overview = await deliverymanApi.getDailyOverview({
            date: selectedDate.value,
            branchId: authStore.user?.branchId
        })
        deliverymenStatsRaw.value = overview.deliverymen
        advances.value = overview.advances
    } catch (err: any) {
        error('Error al cargar datos', err.message)
    } finally {
        loading.value = false
    }
}

// Handler: abrir modal de detalle con getDaySummary (datos frescos)
const handleViewDetail = async (deliverymanId: number) => {
    loadingDetail.value = true
    showDetailModal.value = true
    try {
        const overrideBase = baseAmounts.value.get(deliverymanId)
        const detail = await deliverymanApi.getDaySummary(deliverymanId, {
            date: selectedDate.value,
            ...(overrideBase != null ? { baseAmount: overrideBase } : {}),
        })
        selectedDeliverymanDetail.value = detail
    } catch (err: any) {
        error('Error al cargar detalle', err.message)
        showDetailModal.value = false
    } finally {
        loadingDetail.value = false
    }
}

const openLiquidationWizard = () => {
    if (!selectedDeliverymanDetail.value) return
    showLiquidationWizard.value = true
}

const handleSettleSuccess = async (result: SettleDeliverymanDayResultDto) => {
    const d = selectedDeliverymanDetail.value
    liquidatedDeliveryman.value = d
        ? {
              name: d.deliverymanName,
              amount: result.surplusApplied,
              baseAmount: d.baseAmount,
          }
        : null
    showLiquidationModal.value = true
    closeDetailModal()
    await loadData()
}

const handleUnlockDay = async (deliverymanId: number) => {
    try {
        await deliverymanApi.unlockDay(deliverymanId, selectedDate.value)
        success('Día desbloqueado', 5000, 'Ya puedes operar de nuevo con este domiciliario.')
        await loadData()
    } catch (err: any) {
        error('Error al desbloquear', err.message)
    }
}

const handleBaseAmountChanged = (deliverymanId: number, amount: number) => {
    baseAmounts.value.set(deliverymanId, amount)
}

const handleOrdersClick = (deliverymanId: number) => {
    const stat = deliverymenStats.value.find(s => s.deliverymanId === deliverymanId)
    if (stat) {
        ordersModalDeliveryman.value = { id: deliverymanId, name: stat.deliverymanName }
        showOrdersModal.value = true
    }
}

const closeOrdersModal = () => {
    showOrdersModal.value = false
    ordersModalDeliveryman.value = null
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

    ordersDraftsStore.loadBanks()
    loadData()
})
</script>

