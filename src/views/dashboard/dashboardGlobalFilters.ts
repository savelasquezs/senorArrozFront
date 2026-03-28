/**
 * Escala temporal global del dashboard (sidebar).
 * La lista visible de pestañas depende del periodo (`getAllowedGranularityTabs` en `dashboardGranularityBuckets`).
 */
export type DashboardTimeGranularity = 'day' | 'fortnight' | 'month' | 'year';

/** Granularidad del API de peso por categoría (sin quincena en servidor → día y agregamos en cliente si aplica). */
export function weightApiGranularity(
	g: DashboardTimeGranularity,
): 'day' | 'month' | 'year' {
	if (g === 'year') return 'year';
	if (g === 'month') return 'month';
	return 'day';
}

/** Parámetro `granularity` de la serie de gastos (`auto` = servidor decide). */
export function expenseTimeSeriesGranularity(
	g: DashboardTimeGranularity,
): 'auto' | 'day' | 'month' | undefined {
	if (g === 'day' || g === 'fortnight') return 'day';
	if (g === 'month') return 'month';
	return 'month';
}

/** Escala pedida al API de ventas vs gastos (Principal); quincena se agrega en cliente desde serie diaria. */
export function principalSalesVsExpensesGranularity(
	g: DashboardTimeGranularity,
): 'day' | 'month' | 'year' {
	if (g === 'year') return 'year';
	if (g === 'month') return 'month';
	return 'day';
}
