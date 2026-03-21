/** Inicio del día local (00:00). */
export function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

/** Rango por defecto: últimos `n` días inclusive (hoy = fin). */
export function defaultDateRangeLastDays(n: number): [Date, Date] {
	const end = startOfDay(new Date());
	const start = new Date(end);
	start.setDate(start.getDate() - (n - 1));
	return [start, end];
}

/** Días calendario desde `from` hasta `to` inclusive (ambos normalizados a inicio de día). Máximo `maxDays` por seguridad. */
export function daysInclusive(from: Date, to: Date, maxDays = 62): Date[] {
	const s = startOfDay(from);
	const e = startOfDay(to);
	if (e < s) return [];

	const out: Date[] = [];
	const cur = new Date(s);
	let guard = 0;
	while (cur <= e && guard < maxDays) {
		out.push(new Date(cur));
		cur.setDate(cur.getDate() + 1);
		guard++;
	}
	return out;
}

/**
 * Primer día de cada mes desde el mes de `from` hasta el de `to` (inclusive).
 */
export function monthsInclusive(from: Date, to: Date, maxMonths = 36): Date[] {
	const s = new Date(from.getFullYear(), from.getMonth(), 1);
	const e = new Date(to.getFullYear(), to.getMonth(), 1);
	if (e < s) return [];

	const out: Date[] = [];
	const cur = new Date(s);
	let guard = 0;
	while (cur <= e && guard < maxMonths) {
		out.push(new Date(cur));
		cur.setMonth(cur.getMonth() + 1);
		guard++;
	}
	return out;
}

/**
 * Años enteros desde el año de `from` hasta el de `to` (inclusive).
 */
export function yearsInclusive(from: Date, to: Date, maxYears = 20): number[] {
	const y0 = from.getFullYear();
	const y1 = to.getFullYear();
	if (y1 < y0) return [];

	const out: number[] = [];
	for (let y = y0; y <= y1 && out.length < maxYears; y++) {
		out.push(y);
	}
	return out;
}
