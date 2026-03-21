/** Umbrales por defecto: verde &lt; greenMax, amarillo hasta yellowMax, rojo arriba. */
export function minuteGaugeColor(
	minutes: number,
	greenMax = 30,
	yellowMax = 45,
): string {
	if (minutes < greenMax) return 'rgb(16, 185, 129)'; // emerald-500
	if (minutes <= yellowMax) return 'rgb(245, 158, 11)'; // amber-500
	return 'rgb(239, 68, 68)'; // red-500
}
