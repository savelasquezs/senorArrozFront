import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';

let registered = false;

/** Registra controladores de Chart.js una sola vez (evita errores en HMR). */
export function registerChartJs(): void {
	if (registered) return;
	ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
	registered = true;
}
