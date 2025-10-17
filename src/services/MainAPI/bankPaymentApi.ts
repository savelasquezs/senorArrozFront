// src/services/MainAPI/bankPaymentApi.ts
import { BaseApi } from './baseApi';
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
        filters?: BankPaymentFilters
    ): Promise<PagedResult<BankPayment>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.orderId !== undefined) params.OrderId = filters.orderId;
            if (filters.bankId !== undefined) params.BankId = filters.bankId;
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
            params,
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
        payload: CreateBankPaymentDto
    ): Promise<BankPayment> {
        return this.post<BankPayment>('/bankpayments', payload);
    }

    // 5. Verificar pago bancario
    async verifyBankPayment(
        id: number,
        payload?: VerifyBankPaymentDto
    ): Promise<string> {
        return this.post<string>(`/bankpayments/${id}/verify`, payload);
    }

    // 6. Desverificar pago bancario
    async unverifyBankPayment(id: number): Promise<string> {
        return this.post<string>(`/bankpayments/${id}/unverify`);
    }



    // 8. Actualizar monto de pago bancario
    async updateBankPayment(id: number, amount: number): Promise<BankPayment> {
        return this.put<BankPayment>(`/bankpayments/${id}`, { amount });
    }

    // Alias para mantener consistencia con el plan
    async verify(id: number): Promise<void> {
        await this.verifyBankPayment(id);
    }

    async unverify(id: number): Promise<void> {
        await this.unverifyBankPayment(id);
    }

    async update(id: number, amount: number): Promise<BankPayment> {
        return this.updateBankPayment(id, amount);
    }


}

export const bankPaymentApi = new BankPaymentApi();
