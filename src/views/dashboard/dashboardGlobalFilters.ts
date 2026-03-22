/**
 * Escala temporal global del dashboard (sidebar).
 * - Ventas / evolución: incluye hora.
 * - Peso por categoría: `hour` se trata como `day` en el API.
 * - Gastos: se mapea a la granularidad del API de series.
 */
export type DashboardTimeGranularity = 'day' | 'hour' | 'month' | 'year';

export const DASHBOARD_TIME_GRANULARITY_TABS = [
	{ value: 'day', label: 'Día' },
	{ value: 'hour', label: 'Hora' },
	{ value: 'month', label: 'Mes' },
	{ value: 'year', label: 'Año' },
] as const;

/** Granularidad del API de peso por categoría (sin hora). */
export function weightApiGranularity(
	g: DashboardTimeGranularity,
): 'day' | 'month' | 'year' {
	if (g === 'hour') return 'day';
	if (g === 'year') return 'year';
	if (g === 'month') return 'month';
	return 'day';
}

/** Parámetro `granularity` de la serie de gastos (`auto` = servidor decide). */
export function expenseTimeSeriesGranularity(
	g: DashboardTimeGranularity,
): 'auto' | 'day' | 'month' | undefined {
	if (g === 'hour') return undefined;
	if (g === 'day') return 'day';
	if (g === 'month') return 'month';
	return 'month';
}
