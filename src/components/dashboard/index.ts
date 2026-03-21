export { default as DashboardKpiCard } from './DashboardKpiCard.vue';
export { default as DashboardBarChart } from './DashboardBarChart.vue';
export { default as DashboardSegmentedTabs } from './DashboardSegmentedTabs.vue';
export { default as DashboardMiniBar } from './DashboardMiniBar.vue';
export { default as DashboardRankingTable } from './DashboardRankingTable.vue';
export { default as BranchComparisonPanel } from './BranchComparisonPanel.vue';
export { default as DashboardLineChart } from './DashboardLineChart.vue';
export { default as TimeEvolutionPanel } from './TimeEvolutionPanel.vue';
export { default as DashboardDateRangeFilter } from './DashboardDateRangeFilter.vue';
export { default as DashboardPeriodFilter } from './DashboardPeriodFilter.vue';
export { default as DashboardOrderStatusKanban } from './DashboardOrderStatusKanban.vue';
export { default as DashboardGaugeDoughnut } from './DashboardGaugeDoughnut.vue';
export { default as DashboardGaugeCard } from './DashboardGaugeCard.vue';
export { default as DashboardHorizontalBarChart } from './DashboardHorizontalBarChart.vue';
export { default as DashboardDeliveryScatterChart } from './DashboardDeliveryScatterChart.vue';
export { default as OperationOverviewPanel } from './OperationOverviewPanel.vue';

export { getBranchSeriesColor, branchSeriesColors } from './chartColors';
export { minuteGaugeColor } from './gaugeColors';
export {
	defaultDateRangeLastDays,
	daysInclusive,
	monthsInclusive,
	yearsInclusive,
	startOfDay,
} from './dashboardDateUtils';

export type { DashboardKpiIcon } from './kpi.types';
export type { BarChartDataset } from './barChart.types';
export type { LineChartDataset } from './lineChart.types';
export type { RankingColumn, RankingColumnFormat } from './DashboardRankingTable.types';
export type { BranchComparisonRow } from './branchComparison.types';
export type { SalesTimeSeriesBlock, OrdersPerHourBlock, OrdersTimeSeriesBlock } from './timeEvolution.types';
export type {
	OrderPipelineStatusCounts,
	DeliverymanEfficiencyRow,
	DeliveryScatterPoint,
	DeliveryBranchOption,
} from './operation.types';

export {
	DASHBOARD_PERIOD_PRESET_OPTIONS,
	getDateRangeForPreset,
	getThisFortnightRange,
	getLastFortnightRange,
	defaultDashboardPeriodThisMonth,
	dayCountInclusive,
	type DashboardPeriodPresetId,
	type DashboardPeriodPresetOption,
	type DashboardPeriodValue,
} from '@/utils/dashboardPeriodPresets';

export {
	buildDeliveryEvolutionSeries,
	buildDeliveryEvolutionBundle,
	scaleSeriesToTargetSum,
} from '@/utils/deliveryEvolutionSeries';
export type { DeliveryEvolutionSeries, DeliveryEvolutionBundle } from '@/utils/deliveryEvolutionSeries';
