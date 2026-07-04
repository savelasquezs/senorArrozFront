/**
 * Escala temporal global del dashboard (sidebar).
 * La lista visible de pestañas depende del periodo (`getAllowedGranularityTabs` en `dashboardGranularityBuckets`).
 */
export type DashboardTimeGranularity = 'day' | 'fortnight' | 'month' | 'year';

export type DashboardDayOfWeekFilter = 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const dashboardDayOfWeekOptions: Array<{ value: DashboardDayOfWeekFilter; label: string }> = [
	{ value: 'all', label: 'Todos los dias' },
	{ value: 1, label: 'Lunes' },
	{ value: 2, label: 'Martes' },
	{ value: 3, label: 'Miercoles' },
	{ value: 4, label: 'Jueves' },
	{ value: 5, label: 'Viernes' },
	{ value: 6, label: 'Sabado' },
	{ value: 7, label: 'Domingo' },
];

export function dashboardDayOfWeekToApi(dayOfWeek: DashboardDayOfWeekFilter): number | null {
	return dayOfWeek === 'all' ? null : dayOfWeek;
}

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
