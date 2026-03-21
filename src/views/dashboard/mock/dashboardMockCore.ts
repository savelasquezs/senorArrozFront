/**
 * Datos mock base del dashboard (superadmin). Usado por `dashboardSectionApi` hasta existan endpoints.
 */

import type { BranchComparisonRow } from '@/components/dashboard';
import type {
	DeliverymanEfficiencyRow,
	OrderPipelineStatusCounts,
} from '@/components/dashboard/operation.types';

export type ActivityItem = {
	id: number;
	type: string;
	description: string;
	timestamp: Date;
	branch: string;
	branchId: number;
};

export type KpiState = {
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

export const BASE_BRANCH_COMPARISON_ROWS: BranchComparisonRow[] = [
	{
		id: 1,
		name: 'Santander',
		salesTotal: 2_850_000,
		ordersTotal: 162,
		salesDelivery: 1_920_000,
		salesOnsite: 930_000,
		ordersDelivery: 108,
		ordersOnsite: 54,
		deliveryTimeMinutes: 34,
	},
	{
		id: 2,
		name: 'Centro',
		salesTotal: 2_100_000,
		ordersTotal: 131,
		salesDelivery: 1_450_000,
		salesOnsite: 650_000,
		ordersDelivery: 89,
		ordersOnsite: 42,
		deliveryTimeMinutes: 41,
	},
	{
		id: 3,
		name: 'Norte',
		salesTotal: 1_680_000,
		ordersTotal: 98,
		salesDelivery: 1_100_000,
		salesOnsite: 580_000,
		ordersDelivery: 62,
		ordersOnsite: 36,
		deliveryTimeMinutes: 52,
	},
	{
		id: 4,
		name: 'Manrique',
		salesTotal: 1_420_000,
		ordersTotal: 88,
		salesDelivery: 980_000,
		salesOnsite: 440_000,
		ordersDelivery: 55,
		ordersOnsite: 33,
		deliveryTimeMinutes: 39,
	},
];

export const BASE_KPIS: KpiState = {
	totalSales: 2_500_000,
	totalSalesWeekChangePercent: 5.2,
	totalSalesYearChangePercent: 12.4,
	ordersCount: 145,
	ordersWeekChangePercent: 8.0,
	ordersYearChangePercent: -1.5,
	avgTicket: 17_241,
	avgTicketWeekChangePercent: 3.4,
	avgTicketYearChangePercent: 6.2,
	cancellationRate: 2.1,
	cancellationRateWeekChangePercent: -0.8,
	cancellationRateYearChangePercent: 0.3,
};

export const BASE_PIPELINE: OrderPipelineStatusCounts = {
	taken: 14,
	in_preparation: 11,
	ready: 7,
	on_the_way: 18,
};

export const BASE_RECENT_ACTIVITY: ActivityItem[] = [
	{
		id: 1,
		type: 'order',
		description: 'Nuevo pedido #1234 creado',
		timestamp: new Date(Date.now() - 5 * 60000),
		branch: 'Centro',
		branchId: 2,
	},
	{
		id: 2,
		type: 'user',
		description: 'Usuario Juan Pérez inició sesión',
		timestamp: new Date(Date.now() - 15 * 60000),
		branch: 'Norte',
		branchId: 3,
	},
	{
		id: 3,
		type: 'payment',
		description: 'Pago de $85.000 confirmado',
		timestamp: new Date(Date.now() - 30 * 60000),
		branch: 'Santander',
		branchId: 1,
	},
	{
		id: 4,
		type: 'order',
		description: 'Pedido #1201 listo para envío',
		timestamp: new Date(Date.now() - 45 * 60000),
		branch: 'Manrique',
		branchId: 4,
	},
];

function totalSalesAllBranches(): number {
	return BASE_BRANCH_COMPARISON_ROWS.reduce((s, r) => s + r.salesTotal, 0);
}

/** Escala KPIs y pipeline respecto al peso de ventas de la sucursal (o todas). */
export function buildPrincipalMock(branchId: number | null): {
	kpis: KpiState;
	pipeline: OrderPipelineStatusCounts;
	recentActivity: ActivityItem[];
} {
	const totalAll = totalSalesAllBranches();
	if (branchId == null) {
		return {
			kpis: { ...BASE_KPIS },
			pipeline: { ...BASE_PIPELINE },
			recentActivity: [...BASE_RECENT_ACTIVITY],
		};
	}
	const row = BASE_BRANCH_COMPARISON_ROWS.find((b) => b.id === branchId);
	const ratio = row ? Math.max(0.15, row.salesTotal / totalAll) : 0.25;

	return {
		kpis: {
			totalSales: Math.round(BASE_KPIS.totalSales * ratio),
			totalSalesWeekChangePercent: BASE_KPIS.totalSalesWeekChangePercent,
			totalSalesYearChangePercent: BASE_KPIS.totalSalesYearChangePercent,
			ordersCount: Math.max(12, Math.round(BASE_KPIS.ordersCount * ratio)),
			ordersWeekChangePercent: BASE_KPIS.ordersWeekChangePercent,
			ordersYearChangePercent: BASE_KPIS.ordersYearChangePercent,
			avgTicket: BASE_KPIS.avgTicket,
			avgTicketWeekChangePercent: BASE_KPIS.avgTicketWeekChangePercent,
			avgTicketYearChangePercent: BASE_KPIS.avgTicketYearChangePercent,
			cancellationRate: Math.min(8, BASE_KPIS.cancellationRate + (branchId % 3) * 0.3),
			cancellationRateWeekChangePercent: BASE_KPIS.cancellationRateWeekChangePercent,
			cancellationRateYearChangePercent: BASE_KPIS.cancellationRateYearChangePercent,
		},
		pipeline: {
			taken: Math.max(2, Math.round(BASE_PIPELINE.taken * ratio)),
			in_preparation: Math.max(2, Math.round(BASE_PIPELINE.in_preparation * ratio)),
			ready: Math.max(1, Math.round(BASE_PIPELINE.ready * ratio)),
			on_the_way: Math.max(2, Math.round(BASE_PIPELINE.on_the_way * ratio)),
		},
		recentActivity: BASE_RECENT_ACTIVITY.filter((a) => a.branchId === branchId),
	};
}

export function filterBranchComparisonRows(
	rows: BranchComparisonRow[],
	branchId: number | null,
): BranchComparisonRow[] {
	if (branchId == null) return [...rows];
	const one = rows.find((r) => r.id === branchId);
	return one ? [one] : [];
}

/** Mock domiciliarios por sucursal (evolución / eficiencia) hasta exista API. */
export const BASE_DELIVERYMEN_MOCK: DeliverymanEfficiencyRow[] = [
	{ id: 1, branchId: 1, name: 'Carlos R.', deliveredCount: 32, avgDeliveryMinutes: 33, deliveryFeeTotal: 185_000 },
	{ id: 2, branchId: 1, name: 'María L.', deliveredCount: 28, avgDeliveryMinutes: 38, deliveryFeeTotal: 162_000 },
	{ id: 3, branchId: 2, name: 'Andrés V.', deliveredCount: 22, avgDeliveryMinutes: 44, deliveryFeeTotal: 128_000 },
	{ id: 4, branchId: 2, name: 'Laura M.', deliveredCount: 19, avgDeliveryMinutes: 29, deliveryFeeTotal: 108_000 },
	{ id: 5, branchId: 3, name: 'Diego S.', deliveredCount: 15, avgDeliveryMinutes: 52, deliveryFeeTotal: 89_000 },
	{ id: 6, branchId: 3, name: 'Paola T.', deliveredCount: 24, avgDeliveryMinutes: 31, deliveryFeeTotal: 142_000 },
	{ id: 7, branchId: 4, name: 'Julián M.', deliveredCount: 26, avgDeliveryMinutes: 36, deliveryFeeTotal: 152_000 },
	{ id: 8, branchId: 4, name: 'Sandra K.', deliveredCount: 21, avgDeliveryMinutes: 40, deliveryFeeTotal: 118_000 },
];
