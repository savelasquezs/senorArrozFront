// src/services/MainAPI/orderApi.ts
import { BaseApi } from './baseApi';
import { orderMutationConfig, type OrderMutationSnapshot } from './orderMutation';
import type {
    PagedResult,
} from '@/types/common';
import type {
    Order,
    OrderFilters,
    CreateOrderDto,
    UpdateOrderDto,
    OrderListItem,
    OrderDetailView,
    OrderStatus,
    KitchenSummaryOrder,
    DeliverymanHistoryBranchSummary,
    DeliverymanHistoryNeighborhood,
} from '@/types/order';
import { buildQueryParams, type QueryParamMapper } from './queryParams';

/** Mapeo GET /orders (camelCase filtros → query PascalCase). */
export const orderGetOrdersQueryMapper: QueryParamMapper<OrderFilters> = {
    BranchId: 'branchId',
    CustomerId: 'customerId',
    Type: 'type',
    Status: 'status',
    FromDate: 'fromDate',
    ToDate: 'toDate',
    ForKitchen: 'forKitchen',
    SortBy: 'sortBy',
    SortOrder: 'sortOrder',
    Page: (f) => f.page ?? 1,
    PageSize: (f) => f.pageSize ?? 10,
};

class OrderApi extends BaseApi {
    // 1. Obtener pedidos con filtros y paginación
    async getOrders(
        filters?: OrderFilters
    ): Promise<PagedResult<Order>> {
        const params = filters
            ? buildQueryParams(filters, orderGetOrdersQueryMapper)
            : {};

        return this.get<PagedResult<Order>>('/orders', {
            params,
        });
    }

    /** Query only the selected Colombia day and return full kitchen lines in one response. */
    async getKitchenSummary(date: string, branchId?: number): Promise<KitchenSummaryOrder[]> {
        return this.get<KitchenSummaryOrder[]>('/orders/kitchen-summary', {
            params: { date, ...(branchId ? { branchId } : {}) },
        });
    }

    /** Durable, branch-scoped kitchen voice inbox. */
    async getKitchenVoiceEvents(after?: number, branchId?: number): Promise<{
        cursor: number
        hasMore: boolean
        events: Array<{ id: number; orderId: number; branchId: number; kind: 'new' | 'reservation' }>
    }> {
        return this.get<{
            cursor: number
            hasMore: boolean
            events: Array<{ id: number; orderId: number; branchId: number; kind: 'new' | 'reservation' }>
        }>('/orders/kitchen/voice-events', {
            params: { ...(after !== undefined ? { after } : {}), ...(branchId ? { branchId } : {}) },
        });
    }

    // 2. Obtener pedido por ID
    async getOrderById(id: number): Promise<Order> {
        return this.get<Order>(`/orders/${id}`);
    }

    // 3. Crear pedido
    async createOrder(
        payload: CreateOrderDto
    ): Promise<Order> {
        return this.post<Order>('/orders', payload);
    }

    // 4. Actualizar pedido
    async updateOrder(
        id: number,
        payload: UpdateOrderDto,
        snapshot?: OrderMutationSnapshot
    ): Promise<Order> {
        return this.put<Order>(`/orders/${id}`, payload, orderMutationConfig(snapshot));
    }

    /** Restricted server-side to Superadmin; requires the displayed management version. */
    async transferBranch(id: number, targetBranchId: number, snapshot: OrderMutationSnapshot,
        bankPaymentChanges: Array<{ paymentId: number; targetBankId: number }> = []): Promise<Order> {
        return this.put<Order>(`/orders/${id}/transfer-branch`,
            { targetBranchId, bankPaymentChanges }, orderMutationConfig(snapshot));
    }

    // 5. Cancelar pedido
    async cancelOrder(id: number): Promise<string> {
        return this.delete<string>(`/orders/${id}`);
    }

    // 6. Obtener pedidos activos por sucursal
    async getActiveOrders(branchId: number): Promise<Order[]> {
        return this.get<Order[]>(`/orders/active/${branchId}`);
    }

    // 7. Marcar pedido como completado
    async completeOrder(id: number): Promise<Order> {
        return this.patch<Order>(`/orders/${id}/complete`);
    }

    // 8. Marcar pedido como en preparación
    async prepareOrder(id: number): Promise<Order> {
        return this.patch<Order>(`/orders/${id}/prepare`);
    }

    // 9. Marcar pedido como listo para entrega
    async readyOrder(id: number): Promise<Order> {
        return this.patch<Order>(`/orders/${id}/ready`);
    }

    // 10. Marcar pedido como entregado
    async deliverOrder(id: number): Promise<Order> {
        return this.patch<Order>(`/orders/${id}/deliver`);
    }

    // ===== NUEVOS MÉTODOS PARA VISTA DE LISTA Y DETALLE =====

    // 11. Obtener lista de pedidos con filtros (para tabla)
    async fetchList(filters?: Partial<OrderFilters>): Promise<PagedResult<OrderListItem>> {
        const params: any = {};
        if (filters) {
            if (filters.fromDate) params.FromDate = filters.fromDate;
            if (filters.toDate) params.ToDate = filters.toDate;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
        }

        return this.get<PagedResult<OrderListItem>>('/orders', { params });
    }

    // 12. Obtener detalle completo del pedido
    async fetchDetail(id: number): Promise<OrderDetailView> {
        return this.get<OrderDetailView>(`/orders/${id}/details`);
    }

    // 13. Actualizar pedido (datos básicos y productos)
    async update(id: number, dto: UpdateOrderDto, snapshot?: OrderMutationSnapshot): Promise<Order> {
        return this.put<Order>(`/orders/${id}`, dto, orderMutationConfig(snapshot));
    }

    // 14. Cambiar estado del pedido
    async updateStatus(id: number, status: OrderStatus, reason?: string, snapshot?: OrderMutationSnapshot): Promise<Order> {
        // Convertir status de snake_case a camelCase para el backend C#
        const statusMap: Record<OrderStatus, string> = {
            'awaiting_payment': 'awaitingPayment',
            'taken': 'taken',
            'in_preparation': 'inPreparation',
            'ready': 'ready',
            'on_the_way': 'onTheWay',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
        };

        const backendStatus = statusMap[status] || status;
        return this.put<Order>(`/orders/${id}/status`, { status: backendStatus, reason }, orderMutationConfig(snapshot));
    }

    // 15. Cancelar pedido con razón
    async cancel(id: number, reason: string, snapshot?: OrderMutationSnapshot): Promise<Order> {
        return this.put<Order>(`/orders/${id}/cancel`, { reason }, orderMutationConfig(snapshot));
    }

    // 16. Asignar domiciliario a pedido
    async assignDelivery(id: number, deliveryManId: number, snapshot?: OrderMutationSnapshot): Promise<Order> {
        return this.put<Order>(`/orders/${id}/assign-delivery`, { deliveryManId }, orderMutationConfig(snapshot));
    }

    // 17. Desasignar domiciliario de pedido
    async unassignDelivery(id: number, snapshot?: OrderMutationSnapshot): Promise<Order> {
        return this.put<Order>(`/orders/${id}/unassign-delivery`, {}, orderMutationConfig(snapshot));
    }

    /**
     * Efectivo cobrado en sucursal. Opcional `paidInStoreCashAmount` cuando `paidInStoreCash` es true
     * para fijar o ajustar el monto (validado en backend contra el remanente).
     */
    async setPaidInStoreCash(
        id: number,
        paidInStoreCash: boolean,
        paidInStoreCashAmount?: number | null,
        snapshot?: OrderMutationSnapshot
    ): Promise<Order> {
        const body: {
            paidInStoreCash: boolean
            paidInStoreCashAmount?: number | null
        } = { paidInStoreCash }
        if (paidInStoreCashAmount !== undefined && paidInStoreCashAmount !== null) {
            body.paidInStoreCashAmount = paidInStoreCashAmount
        }
        return this.put<Order>(`/orders/${id}/paid-in-store-cash`, body, orderMutationConfig(snapshot))
    }

    // ===== MÉTODOS PARA MÓDULO DE DOMICILIARIOS =====

    // 18. Obtener pedidos delivery ready (listos para asignar)
    async fetchDeliveryReady(filters?: { branchId?: number; page?: number; pageSize?: number }, signal?: AbortSignal): Promise<PagedResult<OrderListItem>> {
        const params: any = {};
        if (filters?.branchId) params.branchId = filters.branchId;
        if (filters?.page) params.page = filters.page;
        if (filters?.pageSize) params.pageSize = filters.pageSize;

        return this.get<PagedResult<OrderListItem>>('/orders/delivery/ready', { params, signal });
    }

    // 19. Autoasignar pedidos (usado por domiciliarios)
    async selfAssignOrders(data: { orderIds: number[]; password: string; proposalId?: number; expectedPlanVersion?: number }): Promise<OrderListItem[]> {
        return this.post<OrderListItem[]>('/orders/delivery/self-assign', data);
    }

    // 20. Buscar pedidos con filtros avanzados (para historial)
    async searchOrders(filters: any, signal?: AbortSignal): Promise<PagedResult<OrderListItem>> {
        return this.post<PagedResult<OrderListItem>>('/orders/search', filters, { signal });
    }

    getDeliverymanOptions(params: { fromDate?: string; toDate?: string; branchId?: number; remoteOnly?: boolean }, signal?: AbortSignal) {
        return this.get<Array<{ id: number; name: string }>>('/orders/deliveryman-options', { params, signal })
            .then(items => items.map(item => ({ value: item.id, label: item.name })));
    }

    // 21. Obtener pedidos asignados a un domiciliario (opcional: FromDate/ToDate yyyy-MM-DD para filtrar por CreatedAt)
    async fetchAssignedOrders(
        deliveryManId: number,
        filters?: {
            page?: number
            pageSize?: number
            fromDate?: string
            toDate?: string
            branchId?: number
            /** Estado del pedido en la API (p. ej. Delivered para historial de entregas) */
            status?: string
            /** p. ej. Delivery para excluir onsite de la lista en ruta */
            type?: string
            /** Con status Delivered + fechas: incluye onsite OnTheWay en el historial */
            includeOnsiteActiveInHistory?: boolean
            neighborhoodId?: number
        }
    ): Promise<PagedResult<OrderListItem>> {
        const params: Record<string, string | number | boolean> = {};
        if (filters?.page) params.Page = filters.page;
        if (filters?.pageSize) params.PageSize = filters.pageSize;
        if (filters?.fromDate) params.FromDate = filters.fromDate;
        if (filters?.toDate) params.ToDate = filters.toDate;
        if (filters?.branchId != null && filters.branchId > 0) params.BranchId = filters.branchId;
        if (filters?.status) params.Status = filters.status;
        if (filters?.type) params.Type = filters.type;
        if (filters?.includeOnsiteActiveInHistory === true) params.IncludeOnsiteActiveInHistory = true;
        if (filters?.neighborhoodId != null && filters.neighborhoodId > 0)
            params.NeighborhoodId = filters.neighborhoodId;

        return this.get<PagedResult<OrderListItem>>(`/orders/delivery/assigned/${deliveryManId}`, { params });
    }

    /** Barrios distintos con pedidos en el historial (mismos filtros de fechas/sucursal/estado que el listado). */
    async fetchDeliverymanHistoryNeighborhoods(
        deliveryManId: number,
        filters?: { fromDate?: string; toDate?: string; branchId?: number; status?: string }
    ): Promise<DeliverymanHistoryNeighborhood[]> {
        const params: Record<string, string | number> = {};
        if (filters?.fromDate) params.FromDate = filters.fromDate;
        if (filters?.toDate) params.ToDate = filters.toDate;
        if (filters?.branchId != null && filters.branchId > 0) params.BranchId = filters.branchId;
        if (filters?.status) params.Status = filters.status;
        return this.get<DeliverymanHistoryNeighborhood[]>(
            `/orders/delivery/assigned/${deliveryManId}/neighborhoods`,
            { params }
        );
    }

    /** Conteos por sucursal para pestañas del historial (mismo rango de fechas que el listado) */
    async fetchAssignedOrdersBranchSummary(
        deliveryManId: number,
        filters?: {
            fromDate?: string
            toDate?: string
            status?: string
            includeOnsiteActiveInHistory?: boolean
        }
    ): Promise<DeliverymanHistoryBranchSummary[]> {
        const params: Record<string, string | boolean> = {};
        if (filters?.fromDate) params.FromDate = filters.fromDate;
        if (filters?.toDate) params.ToDate = filters.toDate;
        if (filters?.status) params.Status = filters.status;
        if (filters?.includeOnsiteActiveInHistory === true) params.IncludeOnsiteActiveInHistory = true;
        return this.get<DeliverymanHistoryBranchSummary[]>(
            `/orders/delivery/assigned/${deliveryManId}/branch-summary`,
            { params }
        );
    }
}

export const orderApi = new OrderApi();

