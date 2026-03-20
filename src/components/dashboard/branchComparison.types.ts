/** Fila para comparación entre sucursales (API / mock). */
export interface BranchComparisonRow {
	id: number;
	name: string;
	salesTotal: number;
	ordersTotal: number;
	salesDelivery: number;
	salesOnsite: number;
	ordersDelivery: number;
	ordersOnsite: number;
	/** Tiempo medio de entrega en minutos */
	deliveryTimeMinutes: number;
}
