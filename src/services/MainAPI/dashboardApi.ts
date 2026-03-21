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
}

export const dashboardApi = new DashboardApi();
