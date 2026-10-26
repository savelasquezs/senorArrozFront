// src/services/MainAPI/bankPaymentApi.ts
import { BaseApi } from './baseApi';
import { orderMutationConfig, type OrderMutationSnapshot } from './orderMutation';
import type {
    PagedResult,
} from '@/types/common';
import type {
    BankPayment,
    BankPaymentFilters,
    CreateBankPaymentDto,
    VerifyBankPaymentDto,
} from '@/types/bank';

class BankPaymentApi extends BaseApi {
    // 1. Obtener pagos bancarios con filtros y paginación
    async getBankPayments(
        filters?: BankPaymentFilters, signal?: AbortSignal
    ): Promise<PagedResult<BankPayment>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.orderId != null) params.OrderId = filters.orderId;
            if (filters.bankId != null) params.BankId = filters.bankId;
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.verified !== undefined) params.Verified = filters.verified;
            if (filters.fromDate) params.FromDate = filters.fromDate;
            if (filters.toDate) params.ToDate = filters.toDate;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<PagedResult<BankPayment>>('/bankpayments', {
            params, signal,
        });
    }

    // 2. Obtener pago bancario por ID
    async getBankPaymentById(id: number): Promise<BankPayment> {
        return this.get<BankPayment>(`/bankpayments/${id}`);
    }

    // 3. Obtener pagos no verificados
    async getUnverifiedBankPayments(): Promise<BankPayment[]> {
        return this.get<BankPayment[]>('/bankpayments/unverified');
    }

    // 4. Crear pago bancario
    async createBankPayment(
        payload: CreateBankPaymentDto,
        snapshot?: OrderMutationSnapshot
    ): Promise<BankPayment> {
        return this.post<BankPayment>('/bankpayments', payload, orderMutationConfig(snapshot));
    }

    // 5. Verificar pago bancario
    async verifyBankPayment(
        id: number,
        payload?: VerifyBankPaymentDto,
        snapshot?: OrderMutationSnapshot
    ): Promise<string> {
        return this.post<string>(`/bankpayments/${id}/verify`, payload || {}, orderMutationConfig(snapshot));
    }

    // 6. Desverificar pago bancario
    async unverifyBankPayment(id: number, snapshot?: OrderMutationSnapshot): Promise<string> {
        return this.post<string>(`/bankpayments/${id}/unverify`, {}, orderMutationConfig(snapshot));
    }

    async unverifyTodayBankPayments(bankId: number): Promise<{ count: number; message: string }> {
        return this.post<{ count: number; message: string }>('/bankpayments/unverify-today', { bankId });
    }



    // 8. Actualizar monto de pago bancario
    async updateBankPayment(id: number, amount: number, snapshot?: OrderMutationSnapshot): Promise<BankPayment> {
        return this.put<BankPayment>(`/bankpayments/${id}`, { amount }, orderMutationConfig(snapshot));
    }

    // Alias para mantener consistencia con el plan
    async verify(id: number, snapshot?: OrderMutationSnapshot): Promise<void> {
        await this.verifyBankPayment(id, undefined, snapshot);
    }

    async unverify(id: number, snapshot?: OrderMutationSnapshot): Promise<void> {
        await this.unverifyBankPayment(id, snapshot);
    }

    async update(id: number, amount: number, snapshot?: OrderMutationSnapshot): Promise<BankPayment> {
        return this.updateBankPayment(id, amount, snapshot);
    }

    // 9. Eliminar pago bancario
    async deletePayment(id: number, snapshot?: OrderMutationSnapshot): Promise<void> {
        await this.delete(`/bankpayments/${id}`, orderMutationConfig(snapshot))
    }
}

export const bankPaymentApi = new BankPaymentApi();
