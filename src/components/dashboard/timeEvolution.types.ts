import type { LineChartDataset } from './lineChart.types';

/** Datos listos para `DashboardLineChart` (ventas multi-sucursal). */
export interface SalesTimeSeriesBlock {
	labels: string[];
	datasets: LineChartDataset[];
}

/**
 * Serie temporal de conteos de pedidos (una serie agregada).
 * Misma forma para hora, día, mes o año según las etiquetas del eje X.
 */
export interface OrdersPerHourBlock {
	labels: string[];
	counts: number[];
}

/** Alias descriptivo (misma estructura). */
export type OrdersTimeSeriesBlock = OrdersPerHourBlock;
