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
            if (filters.createdAt) params.CreatedAt = filters.createdAt;
            if (filters.reservedFor) params.ReservedFor = filters.reservedFor;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
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
}

export const orderApi = new OrderApi();

