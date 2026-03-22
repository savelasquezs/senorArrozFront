import { BaseApi } from './baseApi';

/** Respuesta alineada a `PrincipalDashboardPayload` / DTOs del API. */
export type DashboardMainApiResponse = {
	kpis: {
		totalSales: number;
		totalSalesWeekChangePercent: number;
		totalSalesYearChangePercent: number;
		ordersCount: number;
		ordersWeekChangePercent: number;
		ordersYearChangePercent: number;
		avgTicket: number;
		avgTicketWeekChangePercent: number;
		avgTicketYearChangePercent: number;
		cancellationRate: number;
		cancellationRateWeekChangePercent: number;
		cancellationRateYearChangePercent: number;
	};
	pipeline: {
		taken: number;
		in_preparation: number;
		ready: number;
		on_the_way: number;
	};
	recentActivity: Array<{
		id: number;
		type: string;
		description: string;
		timestamp: string;
		branch: string;
		branchId: number;
	}>;
	/** Misma ventana temporal que los KPI (domicilios entregados con tiempos en StatusTimes). */
	avgPrepMinutes: number;
	avgDeliveryMinutes: number;
};

export type DashboardDeliveryApiResponse = {
	avgPrepMinutes: number;
	avgDeliveryMinutes: number;
	deliverymen: Array<{
		id: number;
		branchId: number;
		name: string;
		deliveredCount: number;
		avgDeliveryMinutes: number;
		deliveryFeeTotal: number;
	}>;
	evolutionLabels: string[];
	evolutionDeliveries: number[];
	evolutionFees: number[];
};

export type DashboardMainQueryParams = {
	branchId: number | null;
	activityLimit?: number;
	/** Filtro opcional de KPIs (UTC ISO). Ambos o ninguno. */
	kpiFrom?: string;
	kpiTo?: string;
};

class DashboardApi extends BaseApi {
	async getMain(params: DashboardMainQueryParams): Promise<DashboardMainApiResponse> {
		const q: Record<string, string | number> = {
			activityLimit: params.activityLimit ?? 20,
		};
		if (params.branchId != null) q.branchId = params.branchId;
		if (params.kpiFrom != null) q.kpiFrom = params.kpiFrom;
		if (params.kpiTo != null) q.kpiTo = params.kpiTo;
		return this.get<DashboardMainApiResponse>('/dashboard/main', { params: q });
	}

	async getDelivery(
		branchId: number | null,
		fromIso: string,
		toIso: string,
	): Promise<DashboardDeliveryApiResponse> {
		const params: Record<string, string | number> = { from: fromIso, to: toIso };
		if (branchId != null) params.branchId = branchId;
		return this.get<DashboardDeliveryApiResponse>('/dashboard/delivery', { params });
	}

	/** Ventas — comparativa sucursales. */
	async getSalesComparison(
		branchId: number | null,
		fromIso: string,
		toIso: string,
	): Promise<DashboardSalesComparisonApiResponse> {
		const params: Record<string, string | number> = { from: fromIso, to: toIso };
		if (branchId != null) params.branchId = branchId;
		return this.get<DashboardSalesComparisonApiResponse>('/dashboard/sales/comparison', { params });
	}

	/** Ventas — bloques día/hora/mes/año para TimeEvolutionPanel. */
	async getSalesEvolution(
		branchId: number | null,
		fromIso: string,
		toIso: string,
	): Promise<DashboardSalesEvolutionApiResponse> {
		const params: Record<string, string | number> = { from: fromIso, to: toIso };
		if (branchId != null) params.branchId = branchId;
		return this.get<DashboardSalesEvolutionApiResponse>('/dashboard/sales/evolution', { params });
	}

	/** Ventas — ranking productos o categorías + participación recaudo. */
	async getSalesProducts(
		branchId: number | null,
		fromIso: string,
		toIso: string,
		top = 10,
		groupBy: 'product' | 'category' = 'product',
	): Promise<DashboardSalesProductsApiResponse> {
		const params: Record<string, string | number> = { from: fromIso, to: toIso, top, groupBy };
		if (branchId != null) params.branchId = branchId;
		return this.get<DashboardSalesProductsApiResponse>('/dashboard/sales/products', { params });
	}

	/** Peso vendido (g) por categoría + evolución opcional por categoría (datos reales de líneas de pedido). */
	async getSalesCategoryWeights(
		branchId: number | null,
		fromIso: string,
		toIso: string,
		opts: { granularity: 'day' | 'month' | 'year'; categoryId?: number | null },
	): Promise<DashboardCategoryWeightsApiResponse> {
		const params: Record<string, string | number> = {
			from: fromIso,
			to: toIso,
			granularity: opts.granularity,
		};
		if (branchId != null) params.branchId = branchId;
		if (opts.categoryId != null && opts.categoryId !== undefined)
			params.categoryId = opts.categoryId;
		return this.get<DashboardCategoryWeightsApiResponse>('/dashboard/sales/category-weights', { params });
	}

	async getExpenseSummary(
		branchId: number | null,
		fromIso: string,
		toIso: string,
	): Promise<DashboardExpenseSummaryApiResponse> {
		const params: Record<string, string> = { from: fromIso, to: toIso };
		if (branchId != null) params.branchId = String(branchId);
		return this.get<DashboardExpenseSummaryApiResponse>('/dashboard/expenses/summary', { params });
	}

	async getExpenseByCategory(
		branchId: number | null,
		fromIso: string,
		toIso: string,
	): Promise<DashboardExpenseByCategoryApiResponse> {
		const params: Record<string, string> = { from: fromIso, to: toIso };
		if (branchId != null) params.branchId = String(branchId);
		return this.get<DashboardExpenseByCategoryApiResponse>('/dashboard/expenses/by-category', { params });
	}

	async getExpenseTimeSeries(
		branchId: number | null,
		fromIso: string,
		toIso: string,
		opts?: {
			categoryId?: number | null;
			expenseId?: number | null;
			granularity?: 'day' | 'month' | 'auto';
		},
	): Promise<DashboardExpenseTimeSeriesApiResponse> {
		const params: Record<string, string> = { from: fromIso, to: toIso };
		if (branchId != null) params.branchId = String(branchId);
		if (opts?.categoryId != null) params.categoryId = String(opts.categoryId);
		if (opts?.expenseId != null) params.expenseId = String(opts.expenseId);
		if (opts?.granularity && opts.granularity !== 'auto') params.granularity = opts.granularity;
		return this.get<DashboardExpenseTimeSeriesApiResponse>('/dashboard/expenses/timeseries', { params });
	}
}

export type DashboardSalesComparisonApiResponse = {
	rows: Array<{
		id: number;
		name: string;
		salesTotal: number;
		ordersTotal: number;
		salesDelivery: number;
		salesOnsite: number;
		ordersDelivery: number;
		ordersOnsite: number;
		deliveryTimeMinutes: number;
	}>;
};

export type DashboardSalesTimeSeriesApiBlock = {
	labels: string[];
	datasets: Array<{ label: string; data: number[] }>;
};

export type DashboardOrdersTimelineApiBlock = {
	labels: string[];
	counts: number[];
};

export type DashboardSalesEvolutionApiResponse = {
	salesByDay: DashboardSalesTimeSeriesApiBlock;
	salesByHour: DashboardSalesTimeSeriesApiBlock;
	salesByMonth: DashboardSalesTimeSeriesApiBlock;
	salesByYear: DashboardSalesTimeSeriesApiBlock;
	ordersByDay: DashboardOrdersTimelineApiBlock;
	ordersByHour: DashboardOrdersTimelineApiBlock;
	ordersByMonth: DashboardOrdersTimelineApiBlock;
	ordersByYear: DashboardOrdersTimelineApiBlock;
};

export type DashboardCategoryWeightsApiResponse = {
	byCategory: Array<{
		categoryId: number;
		name: string;
		totalWeightGrams: number;
	}>;
	/** Serie única cuando se envía `categoryId` en la petición. */
	evolution: Array<{
		bucketStartUtc: string;
		totalWeightGrams: number;
	}>;
	/** Una serie por categoría cuando no se envía `categoryId`. */
	evolutionsByCategory?: Array<{
		categoryId: number;
		name: string;
		points: Array<{ bucketStartUtc: string; totalWeightGrams: number }>;
	}>;
};

export type DashboardSalesProductsApiResponse = {
	topByQuantity: Array<{
		/** Producto o categoría según `groupBy` en la petición. */
		id: number;
		name: string;
		quantitySold: number;
		revenueCop: number;
	}>;
	participationByRevenue: Array<{ label: string; percent: number; revenueCop: number }>;
	totalRevenueCop: number;
	totalQuantity: number;
	/** Peso total vendido (g) por categoría; solo productos con peso definido. */
	weightByCategory?: Array<{
		categoryId: number;
		name: string;
		totalWeightGrams: number;
	}>;
};

export type DashboardExpenseSummaryApiResponse = {
	totalCop: number;
	headerCount: number;
	lineCount: number;
	avgDailyCop: number;
	avgTicketCop: number;
	previousPeriodTotalCop: number;
	previousPeriodHeaderCount: number;
	totalChangeFromPreviousPercent: number;
};

export type DashboardExpenseByCategoryApiResponse = {
	slices: Array<{
		categoryId: number;
		name: string;
		totalCop: number;
		percent: number;
	}>;
};

export type DashboardExpenseTimeSeriesApiResponse = {
	labels: string[];
	amountsCop: number[];
	granularity: string;
	seriesLabel: string;
};

export const dashboardApi = new DashboardApi();
