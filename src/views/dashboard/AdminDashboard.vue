<template>
    <div class="flex flex-col lg:flex-row-reverse lg:items-start min-h-0 gap-0">
        <DashboardRightNav
            v-model="activeSection"
            :branch-id="adminBranchId"
            :branch-options="deliveryBranchOptions"
            :show-branch-filter="false"
        />
        <div class="min-w-0 flex-1 pb-8 pr-0 lg:pr-6">
            <p
                v-if="adminBranchId == null"
                class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
                No hay sucursal asignada en tu perfil. Los datos de prueba pueden mostrarse como agregados;
                en producción el API usará tu sucursal implícita.
            </p>
            <KeepAlive :max="8">
                <DashboardPrincipalSection
                    v-if="activeSection === 'principal'"
                    key="principal"
                    :loading="principalLoading"
                    :error="principalError"
                    :kpis="principalData?.kpis ?? null"
                    :avg-prep-minutes="principalData?.avgPrepMinutes ?? 0"
                    :avg-delivery-minutes="principalData?.avgDeliveryMinutes ?? 0"
                    :pipeline-counts="principalData?.pipeline ?? null"
                    :recent-activity="principalData?.recentActivity ?? []"
                    :get-activity-icon="getActivityIcon"
                    :format-date="formatDate"
                />
                <DashboardVentasSection
                    v-else-if="activeSection === 'ventas'"
                    key="ventas"
                    :loading="ventasLoading"
                    :error="ventasError"
                    :show-branch-comparison="false"
                    :comparison-rows="ventasComparisonRows"
                    v-model:date-range="evolutionDateRange"
                    :sales-by-day="salesByDay"
                    :sales-by-hour="salesByHour"
                    :sales-by-month="salesByMonth"
                    :sales-by-year="salesByYear"
                    :orders-by-day="ordersByDay"
                    :orders-by-hour="ordersByHour"
                    :orders-by-month="ordersByMonth"
                    :orders-by-year="ordersByYear"
                    :products-payload="ventasProducts"
                />
                <DashboardGastosSection v-else-if="activeSection === 'gastos'" key="gastos" />
                <DashboardDomiciliosSection
                    v-else-if="activeSection === 'domicilios'"
                    key="domicilios"
                    :loading="domiciliosLoading"
                    :error="domiciliosError"
                    :show-branch-filter="false"
                    :branch-options="deliveryBranchOptions"
                    v-model:period="deliveryPeriod"
                    v-model:branch-id="adminBranchIdWritable"
                    v-model:delivery-evolution-driver-id="deliveryEvolutionDriverId"
                    :avg-prep-minutes="avgPrepMinutes"
                    :avg-delivery-minutes="avgDeliveryMinutes"
                    :deliverymen="filteredDeliverymenEfficiency"
                    :evolution-labels="deliveryEvolutionBundle.labels"
                    :evolution-data="deliveryEvolutionDeliveriesScaled"
                    :evolution-fee-data="deliveryEvolutionFeesScaled"
                />
                <DashboardMapaEntregasSection
                    v-else-if="activeSection === 'mapa_entregas'"
                    key="mapa_entregas"
                />
                <DashboardRegalosSection v-else-if="activeSection === 'regalos'" key="regalos" />
            </KeepAlive>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DashboardRightNav, defaultDateRangeLastDays } from '@/components/dashboard'
import { BASE_BRANCH_COMPARISON_ROWS } from '@/views/dashboard/mock/dashboardMockCore'
import { defaultDashboardPeriodThisMonth } from '@/utils/dashboardPeriodPresets'
import { useAuthStore } from '@/store/auth'
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds'
import { useDashboardPrincipalSection } from '@/composables/dashboard/useDashboardPrincipalSection'
import { useDashboardVentasSection } from '@/composables/dashboard/useDashboardVentasSection'
import { useDashboardDomiciliosSection } from '@/composables/dashboard/useDashboardDomiciliosSection'
import { useDashboardShellMockState } from '@/composables/dashboard/useDashboardShellMockState'
import DashboardPrincipalSection from '@/views/dashboard/sections/DashboardPrincipalSection.vue'
import DashboardVentasSection from '@/views/dashboard/sections/DashboardVentasSection.vue'
import DashboardGastosSection from '@/views/dashboard/sections/DashboardGastosSection.vue'
import DashboardDomiciliosSection from '@/views/dashboard/sections/DashboardDomiciliosSection.vue'
import DashboardMapaEntregasSection from '@/views/dashboard/sections/DashboardMapaEntregasSection.vue'
import DashboardRegalosSection from '@/views/dashboard/sections/DashboardRegalosSection.vue'

const authStore = useAuthStore()

/**
 * Sucursal del admin (solo lectura en UI). Ref local writable para v-model con hijos;
 * se sincroniza desde el perfil — no usar storeToRefs(branchId) directo en v-model (readonly).
 */
const adminBranchIdWritable = ref<number | null>(authStore.branchId ?? null)
watch(
    () => authStore.branchId,
    (v) => {
        adminBranchIdWritable.value = v ?? null
    },
    { immediate: true },
)

const adminBranchId = computed(() => adminBranchIdWritable.value)

const activeSection = ref<DashboardSectionId>('principal')

const deliveryPeriod = ref(defaultDashboardPeriodThisMonth())
const evolutionDateRange = ref<[Date, Date]>(defaultDateRangeLastDays(7))

const principalSection = useDashboardPrincipalSection(activeSection, adminBranchIdWritable)
const ventasSection = useDashboardVentasSection(
	activeSection,
	adminBranchIdWritable,
	evolutionDateRange,
)
const domiciliosSection = useDashboardDomiciliosSection(
	activeSection,
	adminBranchIdWritable,
	deliveryPeriod,
)

const principalData = principalSection.data
const principalLoading = principalSection.loading
const principalError = principalSection.error

const ventasLoading = ventasSection.loading
const ventasError = ventasSection.error

const domiciliosLoading = domiciliosSection.loading
const domiciliosError = domiciliosSection.error

const ventasComparisonRows = computed(() => {
    if (activeSection.value !== 'ventas') {
        return BASE_BRANCH_COMPARISON_ROWS
    }
    const rows = ventasSection.data.value?.comparisonRows
    if (rows && rows.length > 0) return rows
    return BASE_BRANCH_COMPARISON_ROWS
})

const ventasProducts = computed(() => ventasSection.data.value?.products ?? null)

const {
    deliveryEvolutionDriverId,
    deliveryBranchOptions,
    deliveryEvolutionBundle,
    filteredDeliverymenEfficiency,
    deliveryEvolutionDeliveriesScaled,
    deliveryEvolutionFeesScaled,
    avgPrepMinutes,
    avgDeliveryMinutes,
    salesByDay: shellSalesByDay,
    salesByHour: shellSalesByHour,
    salesByMonth: shellSalesByMonth,
    salesByYear: shellSalesByYear,
    ordersByDay: shellOrdersByDay,
    ordersByHour: shellOrdersByHour,
    ordersByMonth: shellOrdersByMonth,
    ordersByYear: shellOrdersByYear,
    getActivityIcon,
    formatDate,
} = useDashboardShellMockState({
    branchId: adminBranchIdWritable,
    ventasComparisonRows,
    scopeVentasChartsToBranch: true,
    deliveryPeriod,
    deliveryFromApi: domiciliosSection.deliveryPayload,
    activeSection,
    evolutionDateRange,
})

const salesByDay = computed(
	() => ventasSection.data.value?.evolution?.salesByDay ?? shellSalesByDay.value,
)
const salesByHour = computed(
	() => ventasSection.data.value?.evolution?.salesByHour ?? shellSalesByHour.value,
)
const salesByMonth = computed(
	() => ventasSection.data.value?.evolution?.salesByMonth ?? shellSalesByMonth.value,
)
const salesByYear = computed(
	() => ventasSection.data.value?.evolution?.salesByYear ?? shellSalesByYear.value,
)
const ordersByDay = computed(
	() => ventasSection.data.value?.evolution?.ordersByDay ?? shellOrdersByDay.value,
)
const ordersByHour = computed(
	() => ventasSection.data.value?.evolution?.ordersByHour ?? shellOrdersByHour.value,
)
const ordersByMonth = computed(
	() => ventasSection.data.value?.evolution?.ordersByMonth ?? shellOrdersByMonth.value,
)
const ordersByYear = computed(
	() => ventasSection.data.value?.evolution?.ordersByYear ?? shellOrdersByYear.value,
)
</script>
