<!-- src/views/BankPaymentsList.vue -->
<template>
    <MainLayout page-title="Pagos Bancarios">
        <!-- Loading State -->
        <BaseLoading v-if="store.isLoading" text="Cargando pagos..." />

        <!-- Content -->
        <div v-else class="space-y-6">
            <!-- Filters Card -->
            <BaseCard class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Filtros de búsqueda</h3>
                    <BaseButton @click="clearFilters" variant="outline" size="sm" :icon="XMarkIcon">
                        Limpiar filtros
                    </BaseButton>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <BaseInput v-model="filters.orderId" label="Orden ID" type="number" placeholder="123" />
                    <BaseSelect v-model.number="filters.bankId" :options="bankOptions" label="Banco"
                        placeholder="Todos los bancos" value-key="value" display-key="label" />
                    <BaseSelect v-model="filters.verified" :options="verifiedOptions" label="Estado"
                        placeholder="Todos los estados" />
                    <BaseInput v-model="filters.fromDate" label="Desde" type="date" />
                    <BaseInput v-model="filters.toDate" label="Hasta" type="date" />
                    <div class="flex items-end">
                        <BaseButton @click="load" variant="primary" size="md" :icon="MagnifyingGlassIcon" full-width>
                            Buscar
                        </BaseButton>
                    </div>
                </div>
            </BaseCard>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Pagos" :value="store.list?.totalCount || 0" icon="credit-card" />
                <StatsCard title="Pagos Verificados" :value="verifiedPayments" icon="check-circle" />
                <StatsCard title="Pagos Pendientes" :value="unverifiedPayments" icon="clock" />
                <StatsCard title="Monto Total" :value="formatCurrency(totalAmount)" icon="currency-dollar" />
            </div>

            <!-- Verification Component -->
            <BaseCard class="p-6">
                <BankPaymentVerification :payments="store.list?.items || []" :loading="store.isLoading"
                    @verify="handleVerify" @unverify="handleUnverify" />
            </BaseCard>

            <!-- Pagination -->
            <div v-if="store.list && store.list.totalPages > 1" class="flex items-center justify-between">
                <div class="text-sm text-gray-700">
                    Mostrando {{ ((store.list.page - 1) * store.list.pageSize) + 1 }} a
                    {{ Math.min(store.list.page * store.list.pageSize, store.list.totalCount) }} de
                    {{ store.list.totalCount }} resultados
                </div>
                <div class="flex space-x-2">
                    <BaseButton size="sm" variant="outline" :disabled="!store.list.hasPreviousPage"
                        @click="previousPage" :icon="ChevronLeftIcon">
                        Anterior
                    </BaseButton>
                    <BaseButton size="sm" variant="outline" :disabled="!store.list.hasNextPage" @click="nextPage"
                        :right-icon="ChevronRightIcon">
                        Siguiente
                    </BaseButton>
                </div>
            </div>
        </div>
    </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useBankPaymentsStore } from '@/store/bankPayments'
import { useBanksStore } from '@/store/banks'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/composables/useToast'

import MainLayout from '@/components/layout/MainLayout.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseLoading from '@/components/ui/BaseLoading.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import BankPaymentVerification from '@/components/BankPaymentVerification.vue'

import {
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

import type { BankPaymentFilters } from '@/types/bank'

const store = useBankPaymentsStore()
const banksStore = useBanksStore()
const auth = useAuthStore()
const { success, error: showError } = useToast()

// Filters
const filters = ref<BankPaymentFilters>({
    orderId: undefined,
    bankId: undefined,
    verified: undefined,
    fromDate: undefined,
    toDate: undefined,
    page: 1,
    pageSize: 10
})

// Bank options for filter
const bankOptions = computed(() => {
    if (!banksStore.list?.items) return []
    return [
        { value: undefined, label: 'Todos los bancos' },
        ...banksStore.list.items.map(bank => ({
            value: bank.id,
            label: bank.name
        }))
    ]
})

// Verified status options for filter
const verifiedOptions = ref([
    { value: undefined, label: 'Todos los estados' },
    { value: true, label: 'Verificados' },
    { value: false, label: 'Pendientes' }
])

// Computed stats
const verifiedPayments = computed(() => {
    return store.list?.items?.filter(p => p.isVerified).length || 0
})

const unverifiedPayments = computed(() => {
    return store.list?.items?.filter(p => !p.isVerified).length || 0
})

const totalAmount = computed(() => {
    return store.list?.items?.reduce((total, p) => total + p.amount, 0) || 0
})

// Methods
const load = async () => {
    try {
        const filtersToSend: BankPaymentFilters = {
            orderId: filters.value.orderId,
            bankId: filters.value.bankId,
            verified: filters.value.verified,
            fromDate: filters.value.fromDate,
            toDate: filters.value.toDate,
            branchId: auth.isSuperadmin ? undefined : (auth.branchId || undefined),
            page: filters.value.page || 1,
            pageSize: filters.value.pageSize || 10
        }

        await store.fetch(filtersToSend)
    } catch (e) {
        showError('Error al cargar', 'No se pudieron cargar los pagos bancarios')
    }
}

const clearFilters = async () => {
    filters.value = {
        orderId: undefined,
        bankId: undefined,
        verified: undefined,
        fromDate: undefined,
        toDate: undefined,
        page: 1,
        pageSize: 10
    }
    await load()
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

const previousPage = async () => {
    if (store.list && store.list.hasPreviousPage) {
        filters.value.page = store.list.page - 1
        await load()
    }
}

const nextPage = async () => {
    if (store.list && store.list.hasNextPage) {
        filters.value.page = store.list.page + 1
        await load()
    }
}

const handleVerify = async (paymentIds: number[]) => {
    try {
        // Verify each payment individually
        for (const paymentId of paymentIds) {
            await store.verify(paymentId)
        }
        success('Pagos verificados', 3000, `${paymentIds.length} pagos se han verificado correctamente`)
        await load() // Refresh the list
    } catch (error: any) {
        showError('Error al verificar', error.message || 'No se pudieron verificar los pagos')
    }
}

const handleUnverify = async (paymentIds: number[]) => {
    try {
        // Unverify each payment individually
        for (const paymentId of paymentIds) {
            await store.unverify(paymentId)
        }
        success('Pagos desverificados', 3000, `${paymentIds.length} pagos se han desverificado correctamente`)
        await load() // Refresh the list
    } catch (error: any) {
        showError('Error al desverificar', error.message || 'No se pudieron desverificar los pagos')
    }
}

// Load initial data
onMounted(async () => {
    try {
        // Load banks for filters
        await banksStore.fetch({
            page: 1,
            pageSize: 100,
            branchId: auth.isSuperadmin ? undefined : (auth.branchId || undefined)
        })

        // Load bank payments
        await load()
    } catch (error) {
        console.error('Error loading initial data:', error)
        showError('Error al cargar', 'No se pudieron cargar los datos iniciales')
    }
})
</script>
