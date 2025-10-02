// src/services/MainAPI/appApi.ts
import { BaseApi } from './baseApi';
import type {
    PagedResult,
} from '@/types/common';
import type {
    App,
    AppFilters,
    CreateAppDto,
    UpdateAppDto,
} from '@/types/bank';

class AppApi extends BaseApi {
    // 1. Obtener apps con filtros y paginación
    async getApps(
        filters?: AppFilters
    ): Promise<PagedResult<App>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.bankId !== undefined) params.BankId = filters.bankId;
            if (filters.name) params.Name = filters.name;
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.active !== undefined) params.Active = filters.active;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<PagedResult<App>>('/apps', {
            params,
        });
    }

    // 2. Obtener app por ID
    async getAppById(id: number): Promise<App> {
        return this.get<App>(`/apps/${id}`);
    }

    // 3. Obtener apps por banco
    async getAppsByBank(bankId: number): Promise<App[]> {
        return this.get<App[]>(`/apps/by-bank/${bankId}`);
    }

    // 4. Crear app
    async createApp(
        payload: CreateAppDto
    ): Promise<App> {
        return this.post<App>('/apps', payload);
    }

    // 5. Actualizar app
    async updateApp(
        id: number,
        payload: UpdateAppDto
    ): Promise<App> {
        return this.put<App>(`/apps/${id}`, payload);
    }

    // 6. Eliminar app
    async deleteApp(id: number): Promise<string> {
        return this.delete<string>(`/apps/${id}`);
    }
}

export const appApi = new AppApi();
