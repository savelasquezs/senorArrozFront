<template>
    <div class="min-h-screen bg-gray-50">
        <!-- Header -->
        <div class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="py-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <button @click="$router.go(-1)"
                                class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <ArrowLeftIcon class="w-5 h-5" />
                            </button>
                            <div>
                                <h1 class="text-2xl font-bold text-gray-900">
                                    {{ app?.name || 'Cargando...' }}
                                </h1>
                                <p class="text-sm text-gray-500">
                                    {{ app?.bankName }} - {{ app?.branchName }}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <BaseBadge :type="app?.active ? 'success' : 'danger'"
                                :text="app?.active ? 'Activo' : 'Inactivo'" />
                            <BaseButton v-if="canManageApp" @click="openEditApp" variant="outline" size="sm">
                                <PencilIcon class="w-4 h-4 mr-2" />
                                Editar
                            </BaseButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Loading State -->
            <BaseLoading v-if="appsStore.isLoading" />

            <!-- Error State -->
            <BaseAlert v-else-if="appsStore.error" type="error" :message="appsStore.error" class="mb-6" />

            <!-- App Details -->
            <div v-else-if="app" class="space-y-8">
                <!-- App Info Card -->
                <BaseCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <DevicePhoneMobileIcon class="w-5 h-5 text-green-600" />
                            <h2 class="text-lg font-semibold text-gray-900">Información de la App</h2>
                        </div>
                    </template>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <p class="text-sm text-gray-900">{{ app.name }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                            <p class="text-sm text-gray-900">{{ app.bankName }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                            <p class="text-sm text-gray-900">{{ app.branchName }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <BaseBadge :type="app.active ? 'success' : 'danger'"
                                :text="app.active ? 'Activo' : 'Inactivo'" />
                        </div>
                    </div>
                </BaseCard>

                <!-- Statistics Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard title="Total Pagos" :value="appPayments.length" icon="CreditCardIcon" color="blue" />
                    <StatsCard title="Pagos Liquidados" :value="settledPayments.length" icon="CheckCircleIcon"
                        color="green" />
                    <StatsCard title="Pagos Pendientes" :value="unsettledPayments.length" icon="ClockIcon"
                        color="yellow" />
                </div>

                <!-- App Payments Section -->
                <BaseCard>
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <CreditCardIcon class="w-5 h-5 text-blue-600" />
                                <h2 class="text-lg font-semibold text-gray-900">Pagos de la App</h2>
                            </div>
                            <div class="flex items-center space-x-2">
                                <BaseButton v-if="canManageAppPayments && selectedPayments.length > 0"
                                    @click="settleSelectedPayments" variant="primary" size="sm">
                                    <CheckCircleIcon class="w-4 h-4 mr-2" />
                                    Liquidar Seleccionados ({{ selectedPayments.length }})
                                </BaseButton>
                                <BaseButton @click="fetchAppPayments" variant="outline" size="sm">
                                    <ArrowPathIcon class="w-4 h-4 mr-2" />
                                    Actualizar
                                </BaseButton>
                            </div>
                        </div>
                    </template>

                    <!-- Filters -->
                    <div class="mb-6 flex flex-wrap gap-4">
                        <div class="flex items-center space-x-2">
                            <label class="text-sm font-medium text-gray-700">Estado:</label>
                            <BaseSelect v-model="paymentFilter" :options="paymentFilterOptions" placeholder="Todos"
                                size="sm" @update:model-value="fetchAppPayments" />
                        </div>
                        <div class="flex items-center space-x-2">
                            <label class="text-sm font-medium text-gray-700">Desde:</label>
                            <input v-model="fromDate" type="date"
                                class="text-sm border border-gray-300 rounded-md px-3 py-1"
                                @change="fetchAppPayments" />
                        </div>
                        <div class="flex items-center space-x-2">
                            <label class="text-sm font-medium text-gray-700">Hasta:</label>
                            <input v-model="toDate" type="date"
                                class="text-sm border border-gray-300 rounded-md px-3 py-1"
                                @change="fetchAppPayments" />
                        </div>
                    </div>

                    <!-- App Payments Table -->
                    <div v-if="appPayments.length > 0" class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th v-if="canManageAppPayments" class="px-6 py-3 text-left">
                                        <input type="checkbox" :checked="allPaymentsSelected"
                                            @change="toggleAllPayments"
                                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Orden
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Monto
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th v-if="canManageAppPayments"
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr v-for="payment in appPayments" :key="payment.id" class="hover:bg-gray-50">
                                    <td v-if="canManageAppPayments" class="px-6 py-4 whitespace-nowrap">
                                        <input type="checkbox" :checked="selectedPayments.includes(payment.id)"
                                            @change="togglePaymentSelection(payment.id)"
                                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ payment.id }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        #{{ payment.orderId }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ formatCurrency(payment.amount) }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <BaseBadge :type="payment.isSettled ? 'success' : 'warning'"
                                            :text="payment.isSettled ? 'Liquidado' : 'Pendiente'" />
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ formatDate(payment.createdAt) }}
                                    </td>
                                    <td v-if="canManageAppPayments"
                                        class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button v-if="!payment.isSettled" @click="settlePayment(payment.id)"
                                            class="text-green-600 hover:text-green-900">
                                            Liquidar
                                        </button>
                                        <button v-else @click="unsettlePayment(payment.id)"
                                            class="text-yellow-600 hover:text-yellow-900">
                                            Desliquidar
                                        </button>
                                        <button @click="deleteAppPayment(payment.id)"
                                            class="text-red-600 hover:text-red-900">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Empty State -->
                    <div v-else class="text-center py-8">
                        <CreditCardIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No hay pagos</h3>
                        <p class="text-gray-500">Esta app no tiene pagos registrados.</p>
                    </div>
                </BaseCard>
            </div>
        </div>

        <!-- App Form Dialog -->
        <BaseDialog v-model="showAppForm" title="Editar App" size="md">
            <AppForm v-if="showAppForm" :app="app" @submit="handleAppSubmit" @cancel="closeAppForm" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppsStore } from '@/store/apps'
import { useAppPaymentsStore } from '@/store/appPayments'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import type { App, AppPayment } from '@/types/bank'
import type { UpdateAppDto } from '@/types/bank'

// Components
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import AppForm from '@/components/payments/apps/AppForm.vue'

// Icons
import {
    ArrowLeftIcon,
    DevicePhoneMobileIcon,
    CreditCardIcon,
    PencilIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/vue/24/outline'

// Composables
const route = useRoute()
const appsStore = useAppsStore()
const appPaymentsStore = useAppPaymentsStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// State
const showAppForm = ref(false)
const appPayments = ref<AppPayment[]>([])
const selectedPayments = ref<number[]>([])
const paymentFilter = ref<string>('')
const fromDate = ref('')
const toDate = ref('')

// Computed
const app = computed(() => appsStore.current)
const canManageApp = computed(() => authStore.isAdmin || authStore.isSuperadmin)
const canManageAppPayments = computed(() => authStore.isAdmin || authStore.isSuperadmin)

const settledPayments = computed(() =>
    appPayments.value.filter(p => p.isSettled)
)

const unsettledPayments = computed(() =>
    appPayments.value.filter(p => !p.isSettled)
)

const allPaymentsSelected = computed(() =>
    unsettledPayments.value.length > 0 &&
    unsettledPayments.value.every(p => selectedPayments.value.includes(p.id))
)

const paymentFilterOptions = computed(() => [
    { value: '', label: 'Todos' },
    { value: 'settled', label: 'Liquidados' },
    { value: 'unsettled', label: 'Pendientes' },
])

// Methods
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(amount)
}

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const fetchAppData = async () => {
    const appId = Number(route.params.id)
    if (appId) {
        await appsStore.fetchById(appId)
        await fetchAppPayments()
    }
}

const fetchAppPayments = async () => {
    try {
        const filters: any = {
            appId: app?.value?.id,
            page: 1,
            pageSize: 100,
        }

        if (paymentFilter.value) {
            filters.settled = paymentFilter.value === 'settled'
        }

        if (fromDate.value) {
            filters.fromDate = fromDate.value
        }

        if (toDate.value) {
            filters.toDate = toDate.value
        }

        await appPaymentsStore.fetch(filters)
        appPayments.value = appPaymentsStore.list?.items || []
    } catch (error) {
        console.error('Error fetching app payments:', error)
    }
}

const togglePaymentSelection = (paymentId: number) => {
    const index = selectedPayments.value.indexOf(paymentId)
    if (index > -1) {
        selectedPayments.value.splice(index, 1)
    } else {
        selectedPayments.value.push(paymentId)
    }
}

const toggleAllPayments = () => {
    if (allPaymentsSelected.value) {
        selectedPayments.value = []
    } else {
        selectedPayments.value = unsettledPayments.value.map(p => p.id)
    }
}

const settlePayment = async (paymentId: number) => {
    try {
        await appPaymentsStore.settle(paymentId)
        success('Pago liquidado', 3000, 'El pago se ha liquidado correctamente')
        await fetchAppPayments()
        selectedPayments.value = selectedPayments.value.filter(id => id !== paymentId)
    } catch (error: any) {
        showError('Error', error.message || 'No se pudo liquidar el pago')
    }
}

const settleSelectedPayments = async () => {
    if (selectedPayments.value.length === 0) return

    const totalAmount = appPayments.value
        .filter(p => selectedPayments.value.includes(p.id))
        .reduce((sum, p) => sum + p.amount, 0)

    const confirmMessage = `¿Estás seguro de liquidar ${selectedPayments.value.length} pagos por un total de ${formatCurrency(totalAmount)}?`

    if (confirm(confirmMessage)) {
        try {
            if (selectedPayments.value.length === 1) {
                await appPaymentsStore.settle(selectedPayments.value[0])
            } else {
                await appPaymentsStore.settleMultiple(selectedPayments.value)
            }

            success('Pagos liquidados', 3000, `${selectedPayments.value.length} pagos se han liquidado correctamente`)
            await fetchAppPayments()
            selectedPayments.value = []
        } catch (error: any) {
            showError('Error', error.message || 'No se pudieron liquidar los pagos')
        }
    }
}

const unsettlePayment = async (paymentId: number) => {
    if (confirm('¿Estás seguro de desliquidar este pago?')) {
        try {
            await appPaymentsStore.unsettle(paymentId)
            success('Pago desliquidado', 3000, 'El pago se ha desliquidado correctamente')
            await fetchAppPayments()
        } catch (error: any) {
            showError('Error', error.message || 'No se pudo desliquidar el pago')
        }
    }
}

const deleteAppPayment = async (paymentId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pago?')) {
        try {
            await appPaymentsStore.remove(paymentId)
            success('Pago eliminado', 3000, 'El pago se ha eliminado correctamente')
            await fetchAppPayments()
            selectedPayments.value = selectedPayments.value.filter(id => id !== paymentId)
        } catch (error: any) {
            showError('Error', error.message || 'No se pudo eliminar el pago')
        }
    }
}

const openEditApp = () => {
    showAppForm.value = true
}

const closeAppForm = () => {
    showAppForm.value = false
}

const handleAppSubmit = async (formData: UpdateAppDto) => {
    try {
        if (app.value) {
            await appsStore.update(app.value.id, formData)
            success('App actualizada', 3000, 'La app se ha actualizado correctamente')
            closeAppForm()
        }
    } catch (error: any) {
        showError('Error', error.message || 'No se pudo actualizar la app')
    }
}

// Lifecycle
onMounted(() => {
    fetchAppData()
})
</script>
