// src/services/MainAPI/bankApi.ts
import { BaseApi } from './baseApi';
import type {
    ApiResponse,
    PagedResult,
} from '@/types/common';
import type {
    Bank,
    BankDetail,
    BankFilters,
    CreateBankDto,
    UpdateBankDto,
} from '@/types/bank';

class BankApi extends BaseApi {
    // 1. Obtener bancos con filtros y paginación
    async getBanks(
        filters?: BankFilters
    ): Promise<ApiResponse<PagedResult<Bank>>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.name) params.Name = filters.name;
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.active !== undefined) params.Active = filters.active;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<ApiResponse<PagedResult<Bank>>>('/banks', {
            params,
        });
    }

    // 2. Obtener banco por ID
    async getBankById(id: number): Promise<ApiResponse<Bank>> {
        return this.get<ApiResponse<Bank>>(`/banks/${id}`);
    }

    // 3. Obtener detalles del banco con estadísticas
    async getBankDetail(id: number): Promise<ApiResponse<BankDetail>> {
        return this.get<ApiResponse<BankDetail>>(`/banks/${id}/detail`);
    }

    // 4. Crear banco
    async createBank(
        payload: CreateBankDto
    ): Promise<ApiResponse<Bank>> {
        return this.post<ApiResponse<Bank>>('/banks', payload);
    }

    // 5. Actualizar banco
    async updateBank(
        id: number,
        payload: UpdateBankDto
    ): Promise<ApiResponse<Bank>> {
        return this.put<ApiResponse<Bank>>(`/banks/${id}`, payload);
    }

    // 6. Eliminar banco
    async deleteBank(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/banks/${id}`);
    }
}

export const bankApi = new BankApi();
