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
import { buildQueryParams } from './queryParams';

class AppApi extends BaseApi {
    async getApps(
        filters?: AppFilters
    ): Promise<PagedResult<App>> {
        const params = buildQueryParams(filters, {
            BankId: 'bankId',
            Name: 'name',
            BranchId: 'branchId',
            Active: 'active',
            Page: (value) => value.page ?? 1,
            PageSize: (value) => value.pageSize ?? 10,
            SortBy: 'sortBy',
            SortOrder: 'sortOrder',
        });

        return this.get<PagedResult<App>>('/apps', {
            params,
        });
    }

    async getAppById(id: number): Promise<App> {
        return this.get<App>(`/apps/${id}`);
    }

    async getAppsByBank(bankId: number): Promise<App[]> {
        return this.get<App[]>(`/apps/by-bank/${bankId}`);
    }

    async createApp(
        payload: CreateAppDto
    ): Promise<App> {
        return this.post<App>('/apps', payload);
    }

    async updateApp(
        id: number,
        payload: UpdateAppDto
    ): Promise<App> {
        return this.put<App>(`/apps/${id}`, payload);
    }

    async deleteApp(id: number): Promise<string> {
        return this.delete<string>(`/apps/${id}`);
    }
}

export const appApi = new AppApi();
