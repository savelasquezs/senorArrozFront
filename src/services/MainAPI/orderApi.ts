// src/services/MainAPI/orderApi.ts
import { BaseApi } from './baseApi';
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
} from '@/types/order';

class OrderApi extends BaseApi {
    // 1. Obtener pedidos con filtros y paginación
    async getOrders(
        filters?: OrderFilters
    ): Promise<PagedResult<Order>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.customerId !== undefined) params.CustomerId = filters.customerId;
            if (filters.type) params.Type = filters.type;
            if (filters.status) params.Status = filters.status;
            if (filters.fromDate) params.FromDate = filters.fromDate;
            if (filters.toDate) params.ToDate = filters.toDate;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
        }

        return this.get<PagedResult<Order>>('/orders', {
            params,
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
        payload: UpdateOrderDto
    ): Promise<Order> {
        return this.put<Order>(`/orders/${id}`, payload);
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
    async update(id: number, dto: UpdateOrderDto): Promise<Order> {
        return this.put<Order>(`/orders/${id}`, dto);
    }

    // 14. Cambiar estado del pedido
    async updateStatus(id: number, status: OrderStatus, reason?: string): Promise<Order> {
        // Convertir status de snake_case a camelCase para el backend C#
        const statusMap: Record<OrderStatus, string> = {
            'taken': 'taken',
            'in_preparation': 'inPreparation',
            'ready': 'ready',
            'on_the_way': 'onTheWay',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
        };

        const backendStatus = statusMap[status] || status;
        return this.put<Order>(`/orders/${id}/status`, { status: backendStatus, reason });
    }

    // 15. Cancelar pedido con razón
    async cancel(id: number, reason: string): Promise<Order> {
        return this.put<Order>(`/orders/${id}/cancel`, { reason });
    }

    // 16. Asignar domiciliario a pedido
    async assignDelivery(id: number, deliveryManId: number): Promise<Order> {
        return this.put<Order>(`/orders/${id}/assign-delivery`, { deliveryManId });
    }

    // 17. Desasignar domiciliario de pedido
    async unassignDelivery(id: number): Promise<Order> {
        return this.put<Order>(`/orders/${id}/unassign-delivery`, {});
    }

    // ===== MÉTODOS PARA MÓDULO DE DOMICILIARIOS =====

    // 18. Obtener pedidos delivery ready (listos para asignar)
    async fetchDeliveryReady(filters?: { branchId?: number; page?: number; pageSize?: number }): Promise<PagedResult<OrderListItem>> {
        const params: any = {};
        if (filters?.branchId) params.branchId = filters.branchId;
        if (filters?.page) params.page = filters.page;
        if (filters?.pageSize) params.pageSize = filters.pageSize;

        return this.get<PagedResult<OrderListItem>>('/orders/delivery/ready', { params });
    }

    // 19. Autoasignar pedidos (usado por domiciliarios)
    async selfAssignOrders(data: { orderIds: number[]; password: string }): Promise<OrderListItem[]> {
        return this.post<OrderListItem[]>('/orders/delivery/self-assign', data);
    }

    // 20. Buscar pedidos con filtros avanzados (para historial)
    async searchOrders(filters: any): Promise<PagedResult<OrderListItem>> {
        return this.post<PagedResult<OrderListItem>>('/orders/search', filters);
    }

    // 21. Obtener pedidos asignados a un domiciliario
    async fetchAssignedOrders(deliveryManId: number, filters?: { page?: number; pageSize?: number }): Promise<PagedResult<OrderListItem>> {
        const params: any = {};
        if (filters?.page) params.page = filters.page;
        if (filters?.pageSize) params.pageSize = filters.pageSize;

        return this.get<PagedResult<OrderListItem>>(`/orders/delivery/assigned/${deliveryManId}`, { params });
    }
}

export const orderApi = new OrderApi();

