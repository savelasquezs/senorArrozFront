/**
 * Capa de acceso por sección del dashboard (sin endpoint monolítico).
 * - Principal: `GET /api/dashboard/main` (mock con `VITE_DASHBOARD_PRINCIPAL_MOCK=true`).
 * - Domicilios: `GET /api/dashboard/delivery` con rango de fechas (mock con `VITE_DASHBOARD_DELIVERY_MOCK=true`).
 */

import {
	buildPrincipalMock,
	BASE_BRANCH_COMPARISON_ROWS,
	filterBranchComparisonRows,
	type KpiState,
	type ActivityItem,
} from '@/views/dashboard/mock/dashboardMockCore';
import type { OrderPipelineStatusCounts } from '@/components/dashboard/operation.types';
import type { BranchComparisonRow, DeliverymanEfficiencyRow } from '@/components/dashboard';
import {
	dashboardApi,
	type DashboardMainApiResponse,
	type DashboardDeliveryApiResponse,
	type DashboardSalesComparisonApiResponse,
	type DashboardSalesEvolutionApiResponse,
	type DashboardSalesProductsApiResponse,
} from './dashboardApi';
import type { SalesTimeSeriesBlock, OrdersPerHourBlock } from '@/components/dashboard';

const MOCK_LATENCY_MS = 60;

/** Forzar mock de la sección Principal (útil si el API no está levantado). */
export const USE_PRINCIPAL_MOCK = import.meta.env.VITE_DASHBOARD_PRINCIPAL_MOCK === 'true';

/** Forzar mock de Domicilios (sin llamar a `/dashboard/delivery`). */
export const USE_DELIVERY_MOCK = import.meta.env.VITE_DASHBOARD_DELIVERY_MOCK === 'true';

/** Mock de Ventas: no llama a `/dashboard/sales/*` (comparativa mock + series demo del shell). */
export const USE_VENTAS_MOCK = import.meta.env.VITE_DASHBOARD_VENTAS_MOCK === 'true';

function delay(ms = MOCK_LATENCY_MS): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapPrincipalFromApi(raw: DashboardMainApiResponse): PrincipalDashboardPayload {
	return {
		kpis: raw.kpis as KpiState,
		pipeline: raw.pipeline as OrderPipelineStatusCounts,
		recentActivity: raw.recentActivity.map(
			(a): ActivityItem => ({
				id: a.id,
				type: a.type,
				description: a.description,
				timestamp: new Date(a.timestamp),
				branch: a.branch,
				branchId: a.branchId,
			}),
		),
		avgPrepMinutes: raw.avgPrepMinutes ?? 0,
		avgDeliveryMinutes: raw.avgDeliveryMinutes ?? 0,
	};
}

export type PrincipalDashboardPayload = {
	kpis: KpiState;
	pipeline: OrderPipelineStatusCounts;
	recentActivity: ActivityItem[];
	avgPrepMinutes: number;
	avgDeliveryMinutes: number;
};

export type PrincipalDashboardQueryOptions = {
	/** Rango UTC para KPIs (opcional). Si se envía, deben ir ambas fechas. */
	kpiRange?: [Date, Date];
};

export async function fetchPrincipalDashboard(
	branchId: number | null,
	options?: PrincipalDashboardQueryOptions,
): Promise<PrincipalDashboardPayload> {
	if (USE_PRINCIPAL_MOCK) {
		await delay();
		return buildPrincipalMock(branchId);
	}
	let kpiFrom: string | undefined;
	let kpiTo: string | undefined;
	if (options?.kpiRange) {
		const { from, to } = encodeDashboardRangeToApi(options.kpiRange);
		kpiFrom = from;
		kpiTo = to;
	}
	const raw = await dashboardApi.getMain({
		branchId,
		kpiFrom,
		kpiTo,
	});
	return mapPrincipalFromApi(raw);
}

/** Rango de periodo del dashboard → query `from`/`to` en UTC (inicio/fin de día local inclusive). */
export function encodeDashboardRangeToApi(range: [Date, Date]): { from: string; to: string } {
	const from = new Date(range[0]);
	from.setHours(0, 0, 0, 0);
	const to = new Date(range[1]);
	to.setHours(23, 59, 59, 999);
	return { from: from.toISOString(), to: to.toISOString() };
}

export type DeliveryDashboardPayload = {
	avgPrepMinutes: number;
	avgDeliveryMinutes: number;
	deliverymen: DeliverymanEfficiencyRow[];
	evolutionLabels: string[];
	evolutionDeliveries: number[];
	evolutionFees: number[];
};

function mapDeliveryFromApi(raw: DashboardDeliveryApiResponse): DeliveryDashboardPayload {
	return {
		avgPrepMinutes: raw.avgPrepMinutes,
		avgDeliveryMinutes: raw.avgDeliveryMinutes,
		deliverymen: raw.deliverymen.map((d) => ({
			id: d.id,
			branchId: d.branchId,
			name: d.name,
			deliveredCount: d.deliveredCount,
			avgDeliveryMinutes: d.avgDeliveryMinutes,
			deliveryFeeTotal: d.deliveryFeeTotal,
		})),
		evolutionLabels: raw.evolutionLabels,
		evolutionDeliveries: raw.evolutionDeliveries,
		evolutionFees: raw.evolutionFees,
	};
}

export async function fetchDeliveryDashboard(
	branchId: number | null,
	periodRange: [Date, Date],
): Promise<DeliveryDashboardPayload> {
	const { from, to } = encodeDashboardRangeToApi(periodRange);
	const raw = await dashboardApi.getDelivery(branchId, from, to);
	return mapDeliveryFromApi(raw);
}

export type VentasSalesEvolutionPayload = {
	salesByDay: SalesTimeSeriesBlock;
	salesByHour: SalesTimeSeriesBlock;
	salesByMonth: SalesTimeSeriesBlock;
	salesByYear: SalesTimeSeriesBlock;
	ordersByDay: OrdersPerHourBlock;
	ordersByHour: OrdersPerHourBlock;
	ordersByMonth: OrdersPerHourBlock;
	ordersByYear: OrdersPerHourBlock;
};

export type VentasProductsGroupBy = 'product' | 'category';

export type VentasProductsPayload = {
	/** Top por unidades (bar horizontal). */
	topByQuantity: Array<{
		id: number;
		name: string;
		quantitySold: number;
		revenueCop: number;
	}>;
	/** Donut participación por recaudo. */
	participationLabels: string[];
	participationValues: number[];
	participationPercents: number[];
	totalRevenueCop: number;
	totalQuantity: number;
};

export type VentasDashboardPayload = {
	comparisonRows: BranchComparisonRow[];
	/** `null` si mock o error parcial: el padre usa series demo del shell. */
	evolution: VentasSalesEvolutionPayload | null;
	products: VentasProductsPayload | null;
};

function mapComparisonFromApi(raw: DashboardSalesComparisonApiResponse): BranchComparisonRow[] {
	return raw.rows.map((r) => ({
		id: r.id,
		name: r.name,
		salesTotal: r.salesTotal,
		ordersTotal: r.ordersTotal,
		salesDelivery: r.salesDelivery,
		salesOnsite: r.salesOnsite,
		ordersDelivery: r.ordersDelivery,
		ordersOnsite: r.ordersOnsite,
		deliveryTimeMinutes: r.deliveryTimeMinutes,
	}));
}

function mapSalesBlock(block: DashboardSalesEvolutionApiResponse['salesByDay']): SalesTimeSeriesBlock {
	return {
		labels: block.labels,
		datasets: block.datasets.map((d) => ({
			label: d.label,
			data: d.data,
		})),
	};
}

function mapOrdersBlock(block: DashboardSalesEvolutionApiResponse['ordersByDay']): OrdersPerHourBlock {
	return { labels: block.labels, counts: block.counts };
}

function mapEvolutionFromApi(raw: DashboardSalesEvolutionApiResponse): VentasSalesEvolutionPayload {
	return {
		salesByDay: mapSalesBlock(raw.salesByDay),
		salesByHour: mapSalesBlock(raw.salesByHour),
		salesByMonth: mapSalesBlock(raw.salesByMonth),
		salesByYear: mapSalesBlock(raw.salesByYear),
		ordersByDay: mapOrdersBlock(raw.ordersByDay),
		ordersByHour: mapOrdersBlock(raw.ordersByHour),
		ordersByMonth: mapOrdersBlock(raw.ordersByMonth),
		ordersByYear: mapOrdersBlock(raw.ordersByYear),
	};
}

function mapProductsFromApi(raw: DashboardSalesProductsApiResponse): VentasProductsPayload {
	const slices = raw.participationByRevenue ?? [];
	return {
		topByQuantity: raw.topByQuantity.map((p) => {
			const row = p as { id?: number; productId?: number; name: string; quantitySold: number; revenueCop: number };
			return {
				id: row.id ?? row.productId ?? 0,
				name: row.name,
				quantitySold: row.quantitySold,
				revenueCop: row.revenueCop,
			};
		}),
		participationLabels: slices.map((s) => s.label),
		participationValues: slices.map((s) => s.revenueCop),
		participationPercents: slices.map((s) => s.percent),
		totalRevenueCop: raw.totalRevenueCop,
		totalQuantity: raw.totalQuantity,
	};
}

/**
 * Datos de la sección Ventas: comparativa, evolución temporal y productos.
 * Con `VITE_DASHBOARD_VENTAS_MOCK=true` solo devuelve filas de comparación mock y `evolution`/`products` en null.
 */
export async function fetchVentasDashboard(
	branchId: number | null,
	dateRange: [Date, Date],
	productsGroupBy: VentasProductsGroupBy = 'product',
): Promise<VentasDashboardPayload> {
	if (USE_VENTAS_MOCK) {
		await delay();
		return {
			comparisonRows: filterBranchComparisonRows(BASE_BRANCH_COMPARISON_ROWS, branchId),
			evolution: null,
			products: null,
		};
	}
	const { from, to } = encodeDashboardRangeToApi(dateRange);
	const [comp, evo, prod] = await Promise.all([
		dashboardApi.getSalesComparison(branchId, from, to),
		dashboardApi.getSalesEvolution(branchId, from, to),
		dashboardApi.getSalesProducts(branchId, from, to, 10, productsGroupBy),
	]);
	return {
		comparisonRows: mapComparisonFromApi(comp),
		evolution: mapEvolutionFromApi(evo),
		products: mapProductsFromApi(prod),
	};
}

/** Solo ranking + donut de ventas (mismo rango/sucursal). Para cambiar Productos/Categorías sin recargar comparativa ni evolución. */
export async function fetchVentasProductsOnly(
	branchId: number | null,
	dateRange: [Date, Date],
	productsGroupBy: VentasProductsGroupBy,
): Promise<VentasProductsPayload | null> {
	if (USE_VENTAS_MOCK) return null;
	const { from, to } = encodeDashboardRangeToApi(dateRange);
	const raw = await dashboardApi.getSalesProducts(branchId, from, to, 10, productsGroupBy);
	return mapProductsFromApi(raw);
}

/** @deprecated Usar `fetchVentasDashboard` con rango de fechas. */
export async function fetchVentasDashboardScope(
	branchId: number | null,
): Promise<{ comparisonRows: BranchComparisonRow[] }> {
	const { comparisonRows } = await fetchVentasDashboard(branchId, [
		new Date(Date.now() - 7 * 86400000),
		new Date(),
	]);
	return { comparisonRows };
}
