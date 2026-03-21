/** Contadores de pipeline operativo (excluye delivered / cancelled en este tablero). */
export interface OrderPipelineStatusCounts {
	taken: number;
	in_preparation: number;
	ready: number;
	on_the_way: number;
}

/** Sucursal para filtros del bloque de domiciliarios (id alineado con sucursales del negocio). */
export interface DeliveryBranchOption {
	id: number;
	name: string;
}

export interface DeliverymanEfficiencyRow {
	id: number;
	name: string;
	/** Sucursal a la que pertenece (para filtrar el bloque). */
	branchId: number;
	/** Pedidos entregados en el periodo de referencia */
	deliveredCount: number;
	/** Tiempo medio de entrega (min), p. ej. salida→cliente */
	avgDeliveryMinutes: number;
	/** Recaudo por costo de domicilio (delivery fee) en el periodo, COP */
	deliveryFeeTotal: number;
}

/** Punto para gráfico scatter: X = tiempo (min), Y = entregas */
export interface DeliveryScatterPoint {
	x: number;
	y: number;
	name: string;
	/** Recaudo fees de envío en el periodo (COP); se muestra en tooltip */
	deliveryFeeTotal?: number;
}
