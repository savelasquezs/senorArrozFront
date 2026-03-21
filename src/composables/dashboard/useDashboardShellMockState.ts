import { ref, computed, watch, type Ref, type ComputedRef, type Component } from 'vue';
import {
	getBranchSeriesColor,
	defaultDateRangeLastDays,
	daysInclusive,
	monthsInclusive,
	yearsInclusive,
	type SalesTimeSeriesBlock,
	type OrdersPerHourBlock,
	type DeliverymanEfficiencyRow,
	type DeliveryBranchOption,
	type BranchComparisonRow,
} from '@/components/dashboard';
import { BASE_BRANCH_COMPARISON_ROWS, BASE_DELIVERYMEN_MOCK } from '@/views/dashboard/mock/dashboardMockCore';
import { defaultDashboardPeriodThisMonth } from '@/utils/dashboardPeriodPresets';
import type { DashboardPeriodValue } from '@/utils/dashboardPeriodPresets';
import type { DashboardSectionId } from '@/views/dashboard/dashboardSectionIds';
import type { DeliveryDashboardPayload } from '@/services/MainAPI/dashboardSectionApi';
import { buildDeliveryEvolutionBundle, scaleSeriesToTargetSum } from '@/utils/deliveryEvolutionSeries';
import { ClipboardDocumentListIcon, CurrencyDollarIcon, UsersIcon } from '@heroicons/vue/24/outline';

export interface UseDashboardShellMockStateOptions {
	/** Sucursal activa para domicilios, medias y (opcional) series de ventas. */
	branchId: Ref<number | null>;
	/** Filas usadas para nombres/leyendas en gráficas de ventas (payload Ventas o mock base). */
	ventasComparisonRows: ComputedRef<BranchComparisonRow[]>;
	/**
	 * Admin: dejar una sola serie en ventas alineada a `branchId` y visibilidad por sucursal.
	 * Superadmin: false (multi-sucursal).
	 */
	scopeVentasChartsToBranch?: boolean;
	/** Periodo Domicilios (misma ref que `useDashboardDomiciliosSection`). Si no se pasa, el shell usa una ref interna. */
	deliveryPeriod?: Ref<DashboardPeriodValue>;
	/** Payload de `GET /api/dashboard/delivery` cuando la sección Domicilios está activa. */
	deliveryFromApi?: Ref<DeliveryDashboardPayload | null>;
	/** Para usar datos del API solo mientras se muestra Domicilios (evita mezclar medias en Principal). */
	activeSection?: Ref<DashboardSectionId>;
	/** Rango del `TimeEvolutionPanel` (Ventas); compartido con `useDashboardVentasSection`. */
	evolutionDateRange?: Ref<[Date, Date]>;
}

function scopeSalesBlock(
	block: SalesTimeSeriesBlock,
	bid: number | null,
	rows: BranchComparisonRow[],
): SalesTimeSeriesBlock {
	if (bid == null) return block;
	const row = rows.find((r) => r.id === bid);
	if (!row) return block;
	const datasets = block.datasets.filter((d) => d.label === row.name);
	return datasets.length > 0 ? { ...block, datasets } : block;
}

const HOUR_SLOTS = 14;
const hourLabels = Array.from({ length: HOUR_SLOTS }, (_, i) => {
	const h = 8 + i;
	return `${String(h).padStart(2, '0')}:00`;
});

function mockSalesSeries(len: number, seed: number) {
	return Array.from({ length: len }, (_, i) =>
		Math.max(
			80_000,
			Math.round(
				150_000 + seed * 40_000 + Math.sin(i * 0.85 + seed) * 90_000 + i * 18_000,
			),
		),
	);
}

function mockSalesSeriesScaled(len: number, seed: number, multiplier: number) {
	return mockSalesSeries(len, seed).map((v) => Math.round(v * multiplier));
}

function mockOrderCounts(len: number, seed: number) {
	return Array.from({ length: len }, (_, i) =>
		Math.max(
			1,
			Math.round(
				8 + (seed % 7) * 2 + Math.sin(i * 0.65 + seed * 0.1) * 14 + i * 1.5,
			),
		),
	);
}

/**
 * Estado UI compartido entre `GlobalDashboard` y `AdminDashboard`: periodos, mocks de domicilios,
 * series de ventas/pedidos de demostración y helpers de actividad.
 */
export function useDashboardShellMockState(options: UseDashboardShellMockStateOptions) {
	const {
		branchId,
		ventasComparisonRows,
		scopeVentasChartsToBranch = false,
		deliveryPeriod: deliveryPeriodOption,
		deliveryFromApi,
		activeSection,
		evolutionDateRange: evolutionDateRangeOption,
	} = options;

	const internalEvolutionDateRange = ref<[Date, Date]>(defaultDateRangeLastDays(7));
	const evolutionDateRange = evolutionDateRangeOption ?? internalEvolutionDateRange;
	const internalDeliveryPeriod = ref<DashboardPeriodValue>(defaultDashboardPeriodThisMonth());
	const deliveryPeriod = deliveryPeriodOption ?? internalDeliveryPeriod;
	const deliveryEvolutionDriverId = ref<number | 'all'>('all');

	/** Datos de domicilios del API solo en la sección correspondiente. */
	const domiciliosApiPayload = computed((): DeliveryDashboardPayload | null => {
		if (activeSection?.value !== 'domicilios') return null;
		return deliveryFromApi?.value ?? null;
	});

	watch(branchId, () => {
		deliveryEvolutionDriverId.value = 'all';
	});

	const deliveryBranchOptions = computed<DeliveryBranchOption[]>(() =>
		BASE_BRANCH_COMPARISON_ROWS.map((b) => ({ id: b.id, name: b.name })),
	);

	const deliveryEvolutionBundle = computed(() => {
		const api = domiciliosApiPayload.value;
		if (api) {
			return {
				labels: api.evolutionLabels,
				deliveries: api.evolutionDeliveries,
				feesTotal: api.evolutionFees,
			};
		}
		return buildDeliveryEvolutionBundle(deliveryPeriod.value.range);
	});

	const scaledDeliverymenAll = computed<DeliverymanEfficiencyRow[]>(() => {
		const api = domiciliosApiPayload.value;
		if (api) return api.deliverymen;
		const [from, to] = deliveryPeriod.value.range;
		const seed =
			Math.abs(Math.floor(from.getTime() / 86400000) + Math.floor(to.getTime() / 86400000)) % 97;
		return BASE_DELIVERYMEN_MOCK.map((row, i) => {
			const mult = 0.62 + ((seed + i * 7) % 38) / 100;
			const deliveredCount = Math.max(3, Math.round(row.deliveredCount * mult));
			const feeRatio = deliveredCount / Math.max(1, row.deliveredCount);
			return {
				...row,
				deliveredCount,
				deliveryFeeTotal: Math.round(
					row.deliveryFeeTotal * feeRatio * (0.92 + ((seed + i) % 15) / 100),
				),
				avgDeliveryMinutes: Math.min(
					56,
					Math.max(24, Math.round(row.avgDeliveryMinutes + ((seed + i * 3) % 13) - 6)),
				),
			};
		});
	});

	const filteredDeliverymenEfficiency = computed(() => {
		const bid = branchId.value;
		if (bid == null) return scaledDeliverymenAll.value;
		return scaledDeliverymenAll.value.filter((d) => d.branchId === bid);
	});

	watch(
		filteredDeliverymenEfficiency,
		(rows) => {
			const sel = deliveryEvolutionDriverId.value;
			if (sel !== 'all' && !rows.some((d) => d.id === sel)) {
				deliveryEvolutionDriverId.value = 'all';
			}
		},
		{ deep: true },
	);

	const deliveryEvolutionDeliveriesTargetSum = computed(() => {
		const rows = filteredDeliverymenEfficiency.value;
		const sel = deliveryEvolutionDriverId.value;
		if (sel !== 'all') {
			const one = rows.find((d) => d.id === sel);
			return one ? one.deliveredCount : 0;
		}
		return rows.reduce((s, d) => s + d.deliveredCount, 0);
	});

	const deliveryEvolutionFeesTargetSum = computed(() =>
		filteredDeliverymenEfficiency.value.reduce((s, d) => s + d.deliveryFeeTotal, 0),
	);

	const deliveryEvolutionDeliveriesScaled = computed(() => {
		if (domiciliosApiPayload.value) {
			return domiciliosApiPayload.value.evolutionDeliveries;
		}
		return scaleSeriesToTargetSum(
			deliveryEvolutionBundle.value.deliveries,
			deliveryEvolutionDeliveriesTargetSum.value,
		);
	});

	const deliveryEvolutionFeesScaled = computed(() => {
		if (domiciliosApiPayload.value) {
			return domiciliosApiPayload.value.evolutionFees;
		}
		return scaleSeriesToTargetSum(
			deliveryEvolutionBundle.value.feesTotal,
			deliveryEvolutionFeesTargetSum.value,
		);
	});

	/** Solo sección Domicilios; datos reales vía `deliveryFromApi`. Sin API (mock o carga): 0. */
	const avgPrepMinutes = computed(() => {
		if (activeSection?.value !== 'domicilios') return 0;
		return deliveryFromApi?.value?.avgPrepMinutes ?? 0;
	});

	const avgDeliveryMinutes = computed(() => {
		if (activeSection?.value !== 'domicilios') return 0;
		return deliveryFromApi?.value?.avgDeliveryMinutes ?? 0;
	});

	const salesByDayBase = computed<SalesTimeSeriesBlock>(() => {
		const [from, to] = evolutionDateRange.value;
		const dayList = daysInclusive(from, to, 62);
		const labels = dayList.map((d: Date) =>
			d.toLocaleDateString('es-CO', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
			}),
		);
		const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97);
		const names = ventasComparisonRows.value.map((b) => b.name);
		return {
			labels,
			datasets: names.map((label, i) => {
				const c = getBranchSeriesColor(i);
				return {
					label,
					data: mockSalesSeries(labels.length, i + 1 + seedBase / 10),
					borderColor: c.border,
					backgroundColor: c.area,
				};
			}),
		};
	});

	const salesByHourBase = computed<SalesTimeSeriesBlock>(() => {
		const [, to] = evolutionDateRange.value;
		const daySeed = Math.abs(Math.floor(to.getTime() / 86400000) % 97);
		const names = ventasComparisonRows.value.map((b) => b.name);
		return {
			labels: hourLabels,
			datasets: names.map((label, i) => {
				const c = getBranchSeriesColor(i);
				return {
					label,
					data: mockSalesSeries(HOUR_SLOTS, i + 3 + daySeed / 10),
					borderColor: c.border,
					backgroundColor: c.area,
				};
			}),
		};
	});

	const salesByMonthBase = computed<SalesTimeSeriesBlock>(() => {
		const [from, to] = evolutionDateRange.value;
		const months = monthsInclusive(from, to, 36);
		const labels = months.map((d: Date) =>
			d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
		);
		const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97);
		const names = ventasComparisonRows.value.map((b) => b.name);
		return {
			labels,
			datasets: names.map((label, i) => {
				const c = getBranchSeriesColor(i);
				return {
					label,
					data: mockSalesSeriesScaled(labels.length, i + 2 + seedBase / 12, 22),
					borderColor: c.border,
					backgroundColor: c.area,
				};
			}),
		};
	});

	const salesByYearBase = computed<SalesTimeSeriesBlock>(() => {
		const [from, to] = evolutionDateRange.value;
		const yrs = yearsInclusive(from, to, 20);
		const labels = yrs.map((y) => String(y));
		const seedBase = Math.abs(from.getFullYear() * 13 + to.getFullYear()) % 97;
		const names = ventasComparisonRows.value.map((b) => b.name);
		return {
			labels,
			datasets: names.map((label, i) => {
				const c = getBranchSeriesColor(i);
				return {
					label,
					data: mockSalesSeriesScaled(labels.length, i + 5 + seedBase / 15, 320),
					borderColor: c.border,
					backgroundColor: c.area,
				};
			}),
		};
	});

	const salesByDay = computed<SalesTimeSeriesBlock>(() => {
		const base = salesByDayBase.value;
		if (!scopeVentasChartsToBranch) return base;
		return scopeSalesBlock(base, branchId.value, ventasComparisonRows.value);
	});

	const salesByHour = computed<SalesTimeSeriesBlock>(() => {
		const base = salesByHourBase.value;
		if (!scopeVentasChartsToBranch) return base;
		return scopeSalesBlock(base, branchId.value, ventasComparisonRows.value);
	});

	const salesByMonth = computed<SalesTimeSeriesBlock>(() => {
		const base = salesByMonthBase.value;
		if (!scopeVentasChartsToBranch) return base;
		return scopeSalesBlock(base, branchId.value, ventasComparisonRows.value);
	});

	const salesByYear = computed<SalesTimeSeriesBlock>(() => {
		const base = salesByYearBase.value;
		if (!scopeVentasChartsToBranch) return base;
		return scopeSalesBlock(base, branchId.value, ventasComparisonRows.value);
	});

	const ordersByDay = computed<OrdersPerHourBlock>(() => {
		const [from, to] = evolutionDateRange.value;
		const dayList = daysInclusive(from, to, 62);
		const labels = dayList.map((d: Date) =>
			d.toLocaleDateString('es-CO', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
			}),
		);
		const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97);
		return {
			labels,
			counts: mockOrderCounts(labels.length, seedBase + 11),
		};
	});

	const ordersByHour = computed<OrdersPerHourBlock>(() => {
		const [, to] = evolutionDateRange.value;
		const daySeed = Math.abs(Math.floor(to.getTime() / 86400000) % 97);
		return {
			labels: hourLabels,
			counts: Array.from({ length: HOUR_SLOTS }, (_, i) =>
				Math.round(
					5 +
						i * 0.7 +
						Math.sin(i * 0.45 + daySeed / 20) * 7 +
						(i >= 5 && i <= 9 ? 12 : 0),
				),
			),
		};
	});

	const ordersByMonth = computed<OrdersPerHourBlock>(() => {
		const [from, to] = evolutionDateRange.value;
		const months = monthsInclusive(from, to, 36);
		const labels = months.map((d: Date) =>
			d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
		);
		const seedBase = Math.abs(Math.floor(from.getTime() / 86400000) % 97);
		return {
			labels,
			counts: mockOrderCounts(labels.length, seedBase + 33).map((n) =>
				Math.round(n * 18),
			),
		};
	});

	const ordersByYear = computed<OrdersPerHourBlock>(() => {
		const [from, to] = evolutionDateRange.value;
		const yrs = yearsInclusive(from, to, 20);
		const labels = yrs.map((y) => String(y));
		const seedBase = Math.abs(from.getFullYear() * 11 + to.getFullYear()) % 97;
		return {
			labels,
			counts: mockOrderCounts(labels.length, seedBase + 55).map((n) =>
				Math.round(n * 220),
			),
		};
	});

	function getActivityIcon(type: string): Component {
		const icons = {
			order: ClipboardDocumentListIcon,
			user: UsersIcon,
			payment: CurrencyDollarIcon,
		};
		return icons[type as keyof typeof icons] || ClipboardDocumentListIcon;
	}

	function formatDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);

		if (minutes < 1) return 'Hace un momento';
		if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;

		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;

		return date.toLocaleDateString();
	}

	return {
		evolutionDateRange,
		deliveryPeriod,
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
	};
}
