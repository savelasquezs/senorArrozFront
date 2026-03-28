<template>
    <div class="flex flex-col lg:flex-row-reverse lg:items-start min-h-0 gap-0">
        <DashboardRightNav
            v-model="activeSection"
            v-model:date-range="globalDashboardDateRange"
            v-model:time-granularity="globalTimeGranularity"
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
                    :sales-vs-expenses-loading="principalSalesVsExpensesLoading"
                    :sales-vs-expenses-error="principalSalesVsExpensesError"
                    :sales-vs-expenses="principalSalesVsExpensesData"
                />
                <DashboardVentasSection
                    v-else-if="activeSection === 'ventas'"
                    key="ventas"
                    v-model:products-group-by="ventasProductsGroupBy"
                    v-model:time-granularity="globalTimeGranularity"
                    :loading="ventasLoading"
                    :error="ventasError"
                    :comparison-rows="ventasComparisonRows"
                    :date-range="globalDashboardDateRange"
                    :sales-by-day="salesByDay"
                    :sales-by-fortnight="salesByFortnight"
                    :sales-by-month="salesByMonth"
                    :sales-by-year="salesByYear"
                    :orders-by-day="ordersByDay"
                    :orders-by-fortnight="ordersByFortnight"
                    :orders-by-month="ordersByMonth"
                    :orders-by-year="ordersByYear"
                    :products-payload="ventasProducts"
                    :branch-id="globalDashboardBranchId"
                />
                <DashboardGastosSection
                    v-else-if="activeSection === 'gastos'"
                    key="gastos"
                    v-model:filter-category-id="gastosFilterCategoryId"
                    v-model:filter-expense-id="gastosFilterExpenseId"
                    :loading="gastosLoading"
                    :series-busy="gastosSeriesBusy"
                    :error="gastosError"
                    :payload="gastosData"
                />
                <DashboardDomiciliosSection
                    v-else-if="activeSection === 'domicilios'"
                    key="domicilios"
                    :loading="domiciliosLoading"
                    :error="domiciliosError"
                    :date-range="globalDashboardDateRange"
                    :show-branch-filter="false"
                    :branch-options="deliveryBranchOptions"
                    v-model:branch-id="globalDashboardBranchId"
                    v-model:delivery-evolution-driver-id="deliveryEvolutionDriverId"
                    :avg-prep-minutes="avgPrepMinutes"
                    :avg-delivery-minutes="avgDeliveryMinutes"
                    :deliverymen="filteredDeliverymenEfficiency"
                    :evolution-labels="deliveryEvolutionBundle.labels"
                    :evolution-data="deliveryEvolutionDeliveriesScaled"
                    :evolution-fee-data="deliveryEvolutionFeesScaled"
                    :evolution-sales-totals="deliveryEvolutionBundle.salesTotals"
                    :period-fee-to-sales-percent="deliveryPeriodFeeToSalesPercent"
                    :route-metrics="deliveryRouteMetrics"
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
import { DashboardRightNav, defaultDateRangeToday } from '@/components/dashboard'
import { BASE_BRANCH_COMPARISON_ROWS } from '@/views/dashboard/mock/dashboardMockCore'
import { useAuthStore } from '@/store/auth'
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds'
import { useDashboardPrincipalSection } from '@/composables/dashboard/useDashboardPrincipalSection'
import { useDashboardPrincipalSalesVsExpenses } from '@/composables/dashboard/useDashboardPrincipalSalesVsExpenses'
import { useDashboardVentasSection } from '@/composables/dashboard/useDashboardVentasSection'
import { useDashboardGastosSection } from '@/composables/dashboard/useDashboardGastosSection'
import { useDashboardDomiciliosSection } from '@/composables/dashboard/useDashboardDomiciliosSection'
import { useDashboardShellMockState } from '@/composables/dashboard/useDashboardShellMockState'
import type { VentasProductsGroupBy } from '@/services/MainAPI/dashboardSectionApi'
import type { DashboardTimeGranularity } from '@/views/dashboard/dashboardGlobalFilters'
import {
	aggregateSalesBlockByFortnight,
	aggregateOrdersBlockByFortnight,
	coerceGranularityToAllowed,
} from '@/views/dashboard/dashboardGranularityBuckets'
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

/** Periodo global (sidebar): principal, ventas, domicilios, peso por categoría y gastos. Por defecto: hoy. */
const globalDashboardDateRange = ref<[Date, Date]>(defaultDateRangeToday())
const globalTimeGranularity = ref<DashboardTimeGranularity>('day')

watch(
	globalDashboardDateRange,
	() => {
		const next = coerceGranularityToAllowed(
			globalTimeGranularity.value,
			globalDashboardDateRange.value,
		)
		if (next !== globalTimeGranularity.value) globalTimeGranularity.value = next
	},
	{ deep: true },
)
const ventasProductsGroupBy = ref<VentasProductsGroupBy>('product')

/** Filtro domiciliario: mismo ref para el API y las series del shell. */
const deliveryEvolutionDriverId = ref<number | 'all'>('all')

const principalSection = useDashboardPrincipalSection(
	activeSection,
	globalDashboardBranchId,
	globalDashboardDateRange,
)
const principalSalesVsExpenses = useDashboardPrincipalSalesVsExpenses(
	activeSection,
	globalDashboardBranchId,
	globalDashboardDateRange,
	globalTimeGranularity,
)
const principalSalesVsExpensesLoading = principalSalesVsExpenses.loading
const principalSalesVsExpensesError = principalSalesVsExpenses.error
const principalSalesVsExpensesData = principalSalesVsExpenses.data
const ventasSection = useDashboardVentasSection(
	activeSection,
	globalDashboardBranchId,
	globalDashboardDateRange,
	ventasProductsGroupBy,
)
const domiciliosSection = useDashboardDomiciliosSection(
	activeSection,
	globalDashboardBranchId,
	globalDashboardDateRange,
	deliveryEvolutionDriverId,
)
const gastosSection = useDashboardGastosSection(
	activeSection,
	globalDashboardBranchId,
	globalDashboardDateRange,
	globalTimeGranularity,
)
const {
	loading: gastosLoading,
	seriesBusy: gastosSeriesBusy,
	error: gastosError,
	data: gastosData,
	filterCategoryId: gastosFilterCategoryId,
	filterExpenseId: gastosFilterExpenseId,
} = gastosSection

const principalData = principalSection.data
const principalLoading = principalSection.loading
const principalError = principalSection.error

const ventasLoading = ventasSection.loading
const ventasError = ventasSection.error

const domiciliosLoading = domiciliosSection.loading
const domiciliosError = domiciliosSection.error

const deliveryRouteMetrics = computed(() => domiciliosSection.deliveryPayload.value?.routeMetrics ?? null)

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
    deliveryBranchOptions,
    deliveryEvolutionBundle,
    filteredDeliverymenEfficiency,
    deliveryEvolutionDeliveriesScaled,
    deliveryEvolutionFeesScaled,
    deliveryPeriodFeeToSalesPercent,
    avgPrepMinutes,
    avgDeliveryMinutes,
    salesByDay: shellSalesByDay,
    salesByMonth: shellSalesByMonth,
    salesByYear: shellSalesByYear,
    ordersByDay: shellOrdersByDay,
    ordersByMonth: shellOrdersByMonth,
    ordersByYear: shellOrdersByYear,
    getActivityIcon,
    formatDate,
} = useDashboardShellMockState({
    branchId: globalDashboardBranchId,
    ventasComparisonRows,
    scopeVentasChartsToBranch: false,
    deliveryDateRange: globalDashboardDateRange,
    deliveryFromApi: domiciliosSection.deliveryPayload,
    activeSection,
    evolutionDateRange: globalDashboardDateRange,
    deliveryEvolutionDriverId,
})

const salesByDay = computed(
	() => ventasSection.data.value?.evolution?.salesByDay ?? shellSalesByDay.value,
)
const salesByMonth = computed(
	() => ventasSection.data.value?.evolution?.salesByMonth ?? shellSalesByMonth.value,
)
const salesByYear = computed(
	() => ventasSection.data.value?.evolution?.salesByYear ?? shellSalesByYear.value,
)
const salesByFortnight = computed(() =>
	aggregateSalesBlockByFortnight(salesByDay.value, globalDashboardDateRange.value),
)
const ordersByDay = computed(
	() => ventasSection.data.value?.evolution?.ordersByDay ?? shellOrdersByDay.value,
)
const ordersByMonth = computed(
	() => ventasSection.data.value?.evolution?.ordersByMonth ?? shellOrdersByMonth.value,
)
const ordersByYear = computed(
	() => ventasSection.data.value?.evolution?.ordersByYear ?? shellOrdersByYear.value,
)
const ordersByFortnight = computed(() =>
	aggregateOrdersBlockByFortnight(ordersByDay.value, globalDashboardDateRange.value),
)
</script>
