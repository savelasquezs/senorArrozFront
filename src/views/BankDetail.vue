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
                                    {{ bank?.name || 'Cargando...' }}
                                </h1>
                                <p class="text-sm text-gray-500">
                                    {{ bank?.branchName || 'Sucursal' }}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-3">
                            <BaseBadge :type="bank?.active ? 'success' : 'danger'"
                                :text="bank?.active ? 'Activo' : 'Inactivo'" />
                            <BaseButton v-if="canManageBank" @click="openEditBank" variant="outline" size="sm">
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
            <BaseLoading v-if="banksStore.isLoading" />

            <!-- Error State -->
            <BaseAlert v-else-if="banksStore.error" type="error" :message="banksStore.error" class="mb-6" />

            <!-- Bank Details -->
            <div v-else-if="bank" class="space-y-8">
                <!-- Bank Info Card -->
                <BaseCard>
                    <template #header>
                        <div class="flex items-center space-x-2">
                            <BuildingLibraryIcon class="w-5 h-5 text-blue-600" />
                            <h2 class="text-lg font-semibold text-gray-900">Información del Banco</h2>
                        </div>
                    </template>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <p class="text-sm text-gray-900">{{ bank.name }}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                            <p class="text-sm text-gray-900">{{ bank.branchName }}</p>
                        </div>
                        <div v-if="bank.imageUrl">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                            <img :src="bank.imageUrl" :alt="bank.name" class="w-16 h-16 object-cover rounded-lg" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <BaseBadge :type="bank.active ? 'success' : 'danger'"
                                :text="bank.active ? 'Activo' : 'Inactivo'" />
                        </div>
                    </div>
                </BaseCard>

                <!-- Apps Section -->
                <BaseCard>
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <DevicePhoneMobileIcon class="w-5 h-5 text-green-600" />
                                <h2 class="text-lg font-semibold text-gray-900">Apps del Banco</h2>
                            </div>
                            <BaseButton v-if="canManageApps" @click="openCreateApp" variant="primary" size="sm">
                                <PlusIcon class="w-4 h-4 mr-2" />
                                Nueva App
                            </BaseButton>
                        </div>
                    </template>

                    <!-- Apps Table -->
                    <div v-if="bankApps.length > 0" class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        App
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Pagos
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        No Liquidados
                                    </th>
                                    <th v-if="canManageApps"
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr v-for="app in bankApps" :key="app.id" class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="flex-shrink-0 h-10 w-10">
                                                <div
                                                    class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                    <DevicePhoneMobileIcon class="w-5 h-5 text-green-600" />
                                                </div>
                                            </div>
                                            <div class="ml-4">
                                                <div class="text-sm font-medium text-gray-900">{{ app.name }}</div>
                                                <div class="text-sm text-gray-500">ID: {{ app.id }}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <BaseBadge :type="app.active ? 'success' : 'danger'"
                                            :text="app.active ? 'Activo' : 'Inactivo'" />
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ app.totalPayments || 0 }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ app.unsettledPayments || 0 }}
                                    </td>
                                    <td v-if="canManageApps"
                                        class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button @click="openEditApp(app)" class="text-indigo-600 hover:text-indigo-900">
                                            Editar
                                        </button>
                                        <button @click="deleteApp(app.id)" class="text-red-600 hover:text-red-900">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Empty State -->
                    <div v-else class="text-center py-8">
                        <DevicePhoneMobileIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No hay apps</h3>
                        <p class="text-gray-500 mb-4">Este banco no tiene apps configuradas.</p>
                        <BaseButton v-if="canManageApps" @click="openCreateApp" variant="primary">
                            <PlusIcon class="w-4 h-4 mr-2" />
                            Crear Primera App
                        </BaseButton>
                    </div>
                </BaseCard>

                <!-- Bank Payments Section -->
                <BaseCard>
                    <template #header>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <CreditCardIcon class="w-5 h-5 text-purple-600" />
                                <h2 class="text-lg font-semibold text-gray-900">Pagos Bancarios</h2>
                            </div>
                            <div class="flex items-center space-x-2">
                                <BaseButton @click="fetchBankPayments" variant="outline" size="sm">
                                    <ArrowPathIcon class="w-4 h-4 mr-2" />
                                    Actualizar
                                </BaseButton>
                            </div>
                        </div>
                    </template>

                    <!-- Bank Payments Table -->
                    <div v-if="bankPayments.length > 0" class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
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
                                    <th v-if="canManageBankPayments"
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr v-for="payment in bankPayments" :key="payment.id" class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ payment.id }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ formatCurrency(payment.amount) }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <BaseBadge :type="payment.isVerified ? 'success' : 'warning'"
                                            :text="payment.isVerified ? 'Verificado' : 'No Verificado'" />
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {{ formatDate(payment.createdAt) }}
                                    </td>
                                    <td v-if="canManageBankPayments"
                                        class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button v-if="!payment.isVerified" @click="verifyPayment(payment.id)"
                                            class="text-green-600 hover:text-green-900">
                                            Verificar
                                        </button>
                                        <button v-else @click="unverifyPayment(payment.id)"
                                            class="text-yellow-600 hover:text-yellow-900">
                                            Desverificar
                                        </button>
                                        <button @click="deleteBankPayment(payment.id)"
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
                        <h3 class="text-lg font-medium text-gray-900 mb-2">No hay pagos bancarios</h3>
                        <p class="text-gray-500">Este banco no tiene pagos registrados.</p>
                    </div>
                </BaseCard>
            </div>
        </div>

        <!-- App Form Dialog -->
        <BaseDialog v-model="showAppForm" :title="editingApp ? 'Editar App' : 'Nueva App'" size="md">
            <AppForm v-if="showAppForm" :app="editingApp" :bank-id="bank?.id" @submit="handleAppSubmit"
                @cancel="closeAppForm" />
        </BaseDialog>

        <!-- Bank Form Dialog -->
        <BaseDialog v-model="showBankForm" title="Editar Banco" size="md">
            <BankForm v-if="showBankForm" :bank="bank" @submit="handleBankSubmit" @cancel="closeBankForm" />
        </BaseDialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBanksStore } from '@/store/banks'
import { useAppsStore } from '@/store/apps'
import { useBankPaymentsStore } from '@/store/bankPayments'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'
import type { App, BankPayment } from '@/types/bank'
import type { CreateAppDto, UpdateAppDto } from '@/types/bank'

// Components
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import BankForm from '@/components/payments/banks/BankForm.vue'
import AppForm from '@/components/payments/apps/AppForm.vue'

// Icons
import {
    ArrowLeftIcon,
    BuildingLibraryIcon,
    DevicePhoneMobileIcon,
    CreditCardIcon,
    PlusIcon,
    PencilIcon,
    ArrowPathIcon,
} from '@heroicons/vue/24/outline'

// Composables
const route = useRoute()
const banksStore = useBanksStore()
const appsStore = useAppsStore()
const bankPaymentsStore = useBankPaymentsStore()
const authStore = useAuthStore()
const { success, error: showError } = useToast()

// State
const showAppForm = ref(false)
const showBankForm = ref(false)
const editingApp = ref<App | null>(null)
const bankApps = ref<App[]>([])
const bankPayments = ref<BankPayment[]>([])

// Computed
const bank = computed(() => banksStore.current)
const canManageBank = computed(() => authStore.isAdmin || authStore.isSuperadmin)
const canManageApps = computed(() => authStore.isAdmin || authStore.isSuperadmin)
const canManageBankPayments = computed(() => authStore.isAdmin || authStore.isSuperadmin)

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

const fetchBankData = async () => {
    const bankId = Number(route.params.id)
    if (bankId) {
        await banksStore.fetchById(bankId)
        await fetchBankApps(bankId)
        await fetchBankPayments()
    }
}

const fetchBankApps = async (bankId: number) => {
    try {
        await appsStore.fetchByBank(bankId)
        bankApps.value = appsStore.byBank || []
    } catch (error) {
        console.error('Error fetching bank apps:', error)
    }
}

const fetchBankPayments = async () => {
    try {
        await bankPaymentsStore.fetch({
            bankId: bank.value?.id,
            page: 1,
            pageSize: 100,
        })
        bankPayments.value = bankPaymentsStore.list?.items || []
    } catch (error) {
        console.error('Error fetching bank payments:', error)
    }
}

const openCreateApp = () => {
    editingApp.value = null
    showAppForm.value = true
}

const openEditApp = (app: App) => {
    editingApp.value = app
    showAppForm.value = true
}

const closeAppForm = () => {
    showAppForm.value = false
    editingApp.value = null
}

const handleAppSubmit = async (formData: CreateAppDto | UpdateAppDto) => {
    try {
        if (editingApp.value) {
            await appsStore.update(editingApp.value.id, formData as UpdateAppDto)
            success('App actualizada', 3000, 'La app se ha actualizado correctamente')
        } else {
            await appsStore.create(formData as CreateAppDto)
            success('App creada', 3000, 'La app se ha creado correctamente')
        }

        closeAppForm()
        await fetchBankApps(bank.value?.id || 0)
    } catch (error: any) {
        showError('Error', error.message || 'No se pudo procesar la app')
    }
}

const deleteApp = async (appId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta app?')) {
        try {
            await appsStore.remove(appId)
            success('App eliminada', 3000, 'La app se ha eliminado correctamente')
            await fetchBankApps(bank.value?.id || 0)
        } catch (error: any) {
            showError('Error', error.message || 'No se pudo eliminar la app')
        }
    }
}

const openEditBank = () => {
    showBankForm.value = true
}

const closeBankForm = () => {
    showBankForm.value = false
}

const handleBankSubmit = async (formData: any) => {
    try {
        if (bank.value) {
            await banksStore.update(bank.value.id, formData)
            success('Banco actualizado', 3000, 'El banco se ha actualizado correctamente')
            closeBankForm()
        }
    } catch (error: any) {
        showError('Error', error.message || 'No se pudo actualizar el banco')
    }
}

const verifyPayment = async (paymentId: number) => {
    try {
        await bankPaymentsStore.verify(paymentId)
        success('Pago verificado', 3000, 'El pago bancario se ha verificado correctamente')
        await fetchBankPayments()
    } catch (error: any) {
        showError('Error', error.message || 'No se pudo verificar el pago')
    }
}

const unverifyPayment = async (paymentId: number) => {
    try {
        await bankPaymentsStore.unverify(paymentId)
        success('Pago desverificado', 3000, 'El pago bancario se ha desverificado correctamente')
        await fetchBankPayments()
    } catch (error: any) {
        showError('Error', error.message || 'No se pudo desverificar el pago')
    }
}

const deleteBankPayment = async (paymentId: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pago bancario?')) {
        try {
            await bankPaymentsStore.remove(paymentId)
            success('Pago eliminado', 3000, 'El pago bancario se ha eliminado correctamente')
            await fetchBankPayments()
        } catch (error: any) {
            showError('Error', error.message || 'No se pudo eliminar el pago')
        }
    }
}

// Lifecycle
onMounted(() => {
    fetchBankData()
})
</script>
