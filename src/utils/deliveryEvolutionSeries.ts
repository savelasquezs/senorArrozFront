/**
 * Construye etiquetas y series mock de entregas y recaudo por envío (COP)
 * según la longitud del rango (horas, días, semanas o meses).
 */

import {
	daysInclusive,
	monthsInclusive,
	startOfDay,
} from '@/components/dashboard/dashboardDateUtils';
import { dayCountInclusive } from '@/utils/dashboardPeriodPresets';

export interface DeliveryEvolutionSeries {
	labels: string[];
	data: number[];
}

/** Misma granularidad: entregas por bucket + recaudo total de fees de envío (COP) por bucket. */
export interface DeliveryEvolutionBundle {
	labels: string[];
	deliveries: number[];
	/** Recaudo por costo de domicilio (fees) en el bucket, COP */
	feesTotal: number[];
}

function pseudoRandom(seed: number, i: number): number {
	const x = Math.sin(seed * 0.001 + i * 1.7) * 10000;
	return x - Math.floor(x);
}

/** Fee medio mock por entrega (COP), varía ligeramente por bucket. */
function feePerDeliveryForBucket(seed: number, i: number): number {
	return Math.round(4200 + pseudoRandom(seed, i + 400) * 3800);
}

/**
 * Entregas + recaudo de domicilio por periodo (mismas etiquetas en ambas series).
 */
export function buildDeliveryEvolutionBundle(range: [Date, Date]): DeliveryEvolutionBundle {
	const [from, to] = range;
	const nDays = dayCountInclusive(from, to);
	const seed = Math.abs(Math.floor(startOfDay(from).getTime() / 86400000) % 5000);

	let labels: string[];
	let deliveries: number[];

	if (nDays <= 1) {
		labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
		deliveries = labels.map((_, h) =>
			Math.max(
				0,
				Math.round(
					1 +
						pseudoRandom(seed, h) * 5 +
						(h >= 11 && h <= 14 ? 4 : 0) +
						(h >= 18 && h <= 21 ? 3 : 0),
				),
			),
		);
	} else if (nDays <= 45) {
		const dayList = daysInclusive(from, to, 62);
		labels = dayList.map((d) =>
			d.toLocaleDateString('es-CO', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
			}),
		);
		deliveries = dayList.map((_, i) =>
			Math.max(4, Math.round(18 + pseudoRandom(seed, i) * 22 + Math.sin(i * 0.45) * 12)),
		);
	} else if (nDays <= 120) {
		const dayList = daysInclusive(from, to, 130);
		labels = [];
		deliveries = [];
		for (let i = 0; i < dayList.length; i += 7) {
			const chunk = dayList.slice(i, i + 7);
			const first = chunk[0]!;
			labels.push(
				`Sem. ${first.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`,
			);
			const chunkSum = chunk.reduce(
				(acc, _, j) => acc + Math.max(8, Math.round(80 + pseudoRandom(seed, i + j) * 60)),
				0,
			);
			deliveries.push(chunkSum);
		}
	} else {
		const monthList = monthsInclusive(from, to, 36);
		labels = monthList.map((d) =>
			d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
		);
		deliveries = monthList.map((_, i) =>
			Math.max(120, Math.round(400 + pseudoRandom(seed, i + 100) * 280 + i * 40)),
		);
	}

	const feesTotal = deliveries.map((d, i) => d * feePerDeliveryForBucket(seed, i));

	return { labels, deliveries, feesTotal };
}

/**
 * Escala una serie no negativa para que la suma coincida con `targetSum` (ajuste en el último punto).
 */
export function scaleSeriesToTargetSum(values: number[], targetSum: number): number[] {
	if (values.length === 0) return [];
	const s = values.reduce((a, b) => a + b, 0);
	if (s <= 0) {
		if (targetSum <= 0) return values.map(() => 0);
		const per = Math.floor(targetSum / values.length);
		let rest = targetSum - per * values.length;
		return values.map(() => {
			const x = per + (rest > 0 ? 1 : 0);
			if (rest > 0) rest -= 1;
			return x;
		});
	}
	const factor = targetSum / s;
	const scaled = values.map((v) => Math.max(0, Math.round(v * factor)));
	let diff = targetSum - scaled.reduce((a, b) => a + b, 0);
	const out = [...scaled];
	const last = out.length - 1;
	if (last >= 0) {
		out[last] = Math.max(0, out[last] + diff);
	}
	return out;
}

/**
 * Solo conteos de entregas (compatibilidad).
 */
export function buildDeliveryEvolutionSeries(range: [Date, Date]): DeliveryEvolutionSeries {
	const b = buildDeliveryEvolutionBundle(range);
	return { labels: b.labels, data: b.deliveries };
}
