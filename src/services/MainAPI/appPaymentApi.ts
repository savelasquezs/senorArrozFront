// src/services/MainAPI/appPaymentApi.ts
import { BaseApi } from './baseApi';
import type {
    PagedResult,
} from '@/types/common';
import type {
    AppPayment,
    AppPaymentFilters,
    CreateAppPaymentDto,
    SettleMultipleAppPaymentsDto,
} from '@/types/bank';

class AppPaymentApi extends BaseApi {
    // 1. Obtener pagos de apps con filtros y paginación
    async getAppPayments(
        filters?: AppPaymentFilters
    ): Promise<PagedResult<AppPayment>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.orderId !== undefined) params.OrderId = filters.orderId;
            if (filters.appId !== undefined) params.AppId = filters.appId;
            if (filters.bankId !== undefined) params.BankId = filters.bankId;
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.settled !== undefined) params.Settled = filters.settled;
            if (filters.fromDate) params.FromDate = filters.fromDate;
            if (filters.toDate) params.ToDate = filters.toDate;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<PagedResult<AppPayment>>('/apppayments', {
            params,
        });
    }

    // 2. Obtener pago de app por ID
    async getAppPaymentById(id: number): Promise<AppPayment> {
        return this.get<AppPayment>(`/apppayments/${id}`);
    }

    // 3. Obtener pagos no liquidados
    async getUnsettledAppPayments(
        filters?: {
            appId?: number
            fromDate?: string
            toDate?: string
            page?: number
            pageSize?: number
        }
    ): Promise<AppPayment[]> {
        const params: any = {};
        if (filters) {
            if (filters.appId !== undefined) params.AppId = filters.appId;
            if (filters.fromDate) params.FromDate = filters.fromDate;
            if (filters.toDate) params.ToDate = filters.toDate;
            if (filters.page) params.Page = filters.page;
            if (filters.pageSize) params.PageSize = filters.pageSize;
        }

        return this.get<AppPayment[]>('/apppayments/unsettled', {
            params,
        });
    }

    // 4. Crear pago de app (SOLO desde toma de pedidos)
    async createAppPayment(
        payload: CreateAppPaymentDto
    ): Promise<AppPayment> {
        return this.post<AppPayment>('/apppayments', payload);
    }

    // 5. Liquidar pago individual
    async settleAppPayment(id: number): Promise<string> {
        return this.post<string>(`/apppayments/${id}/settle`);
    }

    // 6. Liquidar múltiples pagos
    async settleMultipleAppPayments(
        payload: SettleMultipleAppPaymentsDto
    ): Promise<string> {
        return this.post<string>('/apppayments/settle-multiple', payload);
    }

    // 7. Desliquidar pago
    async unsettleAppPayment(id: number): Promise<string> {
        return this.post<string>(`/apppayments/${id}/unsettle`);
    }

    // 8. Eliminar pago de app
    async deleteAppPayment(id: number): Promise<string> {
        return this.delete<string>(`/apppayments/${id}`);
    }
}

export const appPaymentApi = new AppPaymentApi();
