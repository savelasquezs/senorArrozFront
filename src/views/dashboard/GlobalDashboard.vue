<template>
    <div class="flex flex-col lg:flex-row-reverse lg:items-start min-h-0 gap-0">
        <DashboardRightNav
            v-model="activeSection"
            v-model:branch-id="globalDashboardBranchId"
            :branch-options="deliveryBranchOptions"
            :show-branch-filter="authStore.isSuperadmin"
        />
        <div class="min-w-0 flex-1 pb-8 pr-0 lg:pr-6">
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
                    v-model:branch-id="globalDashboardBranchId"
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
import { ref, computed } from 'vue'
import { DashboardRightNav } from '@/components/dashboard'
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

const activeSection = ref<DashboardSectionId>('principal')

/** Filtro de sucursal global (superadmin). */
const globalDashboardBranchId = ref<number | null>(null)

/** Periodo Domicilios (compartido: API `from`/`to` + UI del shell). */
const deliveryPeriod = ref(defaultDashboardPeriodThisMonth())

const principalSection = useDashboardPrincipalSection(activeSection, globalDashboardBranchId)
const ventasSection = useDashboardVentasSection(activeSection, globalDashboardBranchId)
const domiciliosSection = useDashboardDomiciliosSection(
	activeSection,
	globalDashboardBranchId,
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

const {
    evolutionDateRange,
    deliveryEvolutionDriverId,
    deliveryBranchOptions,
    deliveryEvolutionBundle,
    filteredDeliverymenEfficiency,
    deliveryEvolutionDeliveriesScaled,
    deliveryEvolutionFeesScaled,
    avgPrepMinutes,
    avgDeliveryMinutes,
    salesByDay,
    salesByHour,
    salesByMonth,
    salesByYear,
    ordersByDay,
    ordersByHour,
    ordersByMonth,
    ordersByYear,
    getActivityIcon,
    formatDate,
} = useDashboardShellMockState({
    branchId: globalDashboardBranchId,
    ventasComparisonRows,
    scopeVentasChartsToBranch: false,
    deliveryPeriod,
    deliveryFromApi: domiciliosSection.deliveryPayload,
    activeSection,
})
</script>
