/**
 * Capa de acceso por sección del dashboard. Sustituir `fetch*` por llamadas HTTP reales;
 * cada sección debe tener su propio contrato (sin endpoint monolítico).
 */

import {
	buildPrincipalMock,
	BASE_BRANCH_COMPARISON_ROWS,
	filterBranchComparisonRows,
	type KpiState,
	type ActivityItem,
} from '@/views/dashboard/mock/dashboardMockCore';
import type { OrderPipelineStatusCounts } from '@/components/dashboard/operation.types';
import type { BranchComparisonRow } from '@/components/dashboard';

const MOCK_LATENCY_MS = 60;

function delay(ms = MOCK_LATENCY_MS): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PrincipalDashboardPayload = {
	kpis: KpiState;
	pipeline: OrderPipelineStatusCounts;
	recentActivity: ActivityItem[];
};

export async function fetchPrincipalDashboard(
	branchId: number | null,
): Promise<PrincipalDashboardPayload> {
	await delay();
	return buildPrincipalMock(branchId);
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

export type DomiciliosDashboardScopePayload = {
	branchId: number | null;
};

/** Marca de “vista cargada” para domicilios; los datos detallados siguen en el padre (periodo, etc.). */
export async function fetchDomiciliosDashboardScope(
	branchId: number | null,
): Promise<DomiciliosDashboardScopePayload> {
	await delay();
	return { branchId };
}
