export interface BarChartDataset {
	label: string;
	data: (number | null)[];
	backgroundColor?: string | string[];
	/** Mismo `stack` en varios datasets = barras apiladas (Chart.js). */
	stack?: string;
}
