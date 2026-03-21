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
} from './dashboardApi';

const MOCK_LATENCY_MS = 60;

/** Forzar mock de la sección Principal (útil si el API no está levantado). */
export const USE_PRINCIPAL_MOCK = import.meta.env.VITE_DASHBOARD_PRINCIPAL_MOCK === 'true';

/** Forzar mock de Domicilios (sin llamar a `/dashboard/delivery`). */
export const USE_DELIVERY_MOCK = import.meta.env.VITE_DASHBOARD_DELIVERY_MOCK === 'true';

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

export type VentasDashboardScopePayload = {
	comparisonRows: BranchComparisonRow[];
};

/** Alcance de sucursal para comparación y series (mock). */
export async function fetchVentasDashboardScope(
	branchId: number | null,
): Promise<VentasDashboardScopePayload> {
	await delay();
	return {
		comparisonRows: filterBranchComparisonRows(BASE_BRANCH_COMPARISON_ROWS, branchId),
	};
}
