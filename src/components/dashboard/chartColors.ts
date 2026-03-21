/** Paleta consistente para series por sucursal (líneas / leyendas). */
export const branchSeriesColors = [
	{ border: 'rgb(5, 120, 90)', point: 'rgb(5, 120, 90)', area: 'rgba(5, 120, 90, 0.14)' },
	{ border: 'rgb(37, 99, 235)', point: 'rgb(37, 99, 235)', area: 'rgba(37, 99, 235, 0.14)' },
	{ border: 'rgb(194, 65, 12)', point: 'rgb(194, 65, 12)', area: 'rgba(194, 65, 12, 0.14)' },
	{ border: 'rgb(124, 58, 237)', point: 'rgb(124, 58, 237)', area: 'rgba(124, 58, 237, 0.14)' },
	{ border: 'rgb(180, 83, 9)', point: 'rgb(180, 83, 9)', area: 'rgba(180, 83, 9, 0.14)' },
] as const;

export function getBranchSeriesColor(index: number) {
	return branchSeriesColors[index % branchSeriesColors.length];
}
