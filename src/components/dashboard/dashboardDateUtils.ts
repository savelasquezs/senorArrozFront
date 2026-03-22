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

/** Rango por defecto: solo el día en curso (inicio y fin del mismo día local). */
export function defaultDateRangeToday(): [Date, Date] {
	const day = startOfDay(new Date());
	return [new Date(day), new Date(day)];
}

/** Un solo día: ayer (calendario local). */
export function defaultDateRangeYesterday(): [Date, Date] {
	const y = startOfDay(new Date());
	y.setDate(y.getDate() - 1);
	return [new Date(y), new Date(y)];
}

/** Mes calendario en curso: día 1 → último día del mes (hora local). */
export function defaultDateRangeThisMonth(): [Date, Date] {
	const now = new Date();
	const first = new Date(now.getFullYear(), now.getMonth(), 1);
	const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return [startOfDay(first), startOfDay(last)];
}

/** Mes calendario anterior completo. */
export function defaultDateRangeLastMonth(): [Date, Date] {
	const now = new Date();
	const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const last = new Date(now.getFullYear(), now.getMonth(), 0);
	return [startOfDay(first), startOfDay(last)];
}

/**
 * Quincena en curso: días 1–15 o 16–último del mes (calendario local).
 */
export function defaultDateRangeThisFortnight(): [Date, Date] {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const d = now.getDate();

	if (d <= 15) {
		const first = new Date(y, m, 1);
		const last = new Date(y, m, 15);
		return [startOfDay(first), startOfDay(last)];
	}
	const first = new Date(y, m, 16);
	const last = new Date(y, m + 1, 0);
	return [startOfDay(first), startOfDay(last)];
}

/**
 * Quincena anterior: si estamos en 1ª quincena, la 2ª del mes pasado; si en 2ª, la 1ª del mismo mes.
 */
export function defaultDateRangeLastFortnight(): [Date, Date] {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	const d = now.getDate();

	if (d <= 15) {
		const first = new Date(y, m - 1, 16);
		const last = new Date(y, m, 0);
		return [startOfDay(first), startOfDay(last)];
	}
	const first = new Date(y, m, 1);
	const last = new Date(y, m, 15);
	return [startOfDay(first), startOfDay(last)];
}

/** Año calendario en curso (1 ene – 31 dic). */
export function defaultDateRangeThisYear(): [Date, Date] {
	const y = new Date().getFullYear();
	const first = new Date(y, 0, 1);
	const last = new Date(y, 11, 31);
	return [startOfDay(first), startOfDay(last)];
}

/** Año calendario anterior completo. */
export function defaultDateRangeLastYear(): [Date, Date] {
	const y = new Date().getFullYear() - 1;
	const first = new Date(y, 0, 1);
	const last = new Date(y, 11, 31);
	return [startOfDay(first), startOfDay(last)];
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
