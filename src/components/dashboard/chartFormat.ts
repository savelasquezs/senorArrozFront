/** Formato compacto eje Y / tooltips (COP). */
export function formatAxisCurrency(value: number | string): string {
	const n = typeof value === 'string' ? Number(value) : value;
	if (Number.isNaN(n)) return String(value);
	if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1000) return `$ ${(n / 1000).toFixed(0)}k`;
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(n);
}

export function formatTooltipCurrency(value: number): string {
	return new Intl.NumberFormat('es-CO', {
		style: 'currency',
		currency: 'COP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}
