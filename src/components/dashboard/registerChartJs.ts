import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	LineController,
	Filler,
	ArcElement,
	DoughnutController,
	ScatterController,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';

let registered = false;

/** Registra controladores de Chart.js una sola vez (evita errores en HMR). */
export function registerChartJs(): void {
	if (registered) return;
	ChartJS.register(
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		PointElement,
		LineController,
		Filler,
		ArcElement,
		DoughnutController,
		ScatterController,
		Title,
		Tooltip,
		Legend,
	);
	registered = true;
}
