import axios from 'axios';
import { BaseApi } from './baseApi';
import type { ApiResponse, PagedResult } from '@/types/common';
import type { Customer } from '@/types/customer';

export type CustomerSuggestion = Pick<Customer, 'id' | 'branchId' | 'name' | 'phone1' | 'phone2' | 'whatsAppUsername' | 'billingCompanies'>;
export interface CustomerSuggestionPage { items: CustomerSuggestion[]; page: number; hasMore: boolean }
const PAGE_SIZE = 10;

export class CustomerLookupApi extends BaseApi {
    private async read<T>(url: string, params: Record<string, unknown> | undefined, signal?: AbortSignal): Promise<T> {
        try { return (await this.api.get<ApiResponse<T>>(url, { params, signal })).data.data; }
        catch (cause: any) {
            if (signal?.aborted || axios.isCancel(cause)) throw cause;
            throw Object.assign(this.handleError(cause), { status: cause.response?.status });
        }
    }

    async search(search: string, branchId: number, page = 1, signal?: AbortSignal): Promise<CustomerSuggestionPage> {
        const params = { search, branchId, page };
        try { return await this.read<CustomerSuggestionPage>('/customers/lookup/search', params, signal); }
        catch (cause: any) {
            if (signal?.aborted || ![404, 405].includes(cause.status)) throw cause;
            // Compatibility during API-first rollout/rollback only. Never fall back on auth/server errors.
            const data = await this.read<PagedResult<Customer>>('/customers', { ...params, pageSize: PAGE_SIZE, active: true }, signal);
            return { items: data.items.map(({ id, branchId, name, phone1, phone2, whatsAppUsername, billingCompanies }) =>
                ({ id, branchId, name, phone1, phone2, whatsAppUsername, billingCompanies })),
                page: data.page, hasMore: data.page < data.totalPages };
        }
    }

    async getCustomer(id: number, signal?: AbortSignal): Promise<Customer> {
        try { return await this.read<Customer>(`/customers/lookup/${id}`, undefined, signal); }
        catch (cause: any) {
            if (signal?.aborted || ![404, 405].includes(cause.status)) throw cause;
            return this.read<Customer>(`/customers/${id}`, undefined, signal);
        }
    }
}
export const customerLookupApi = new CustomerLookupApi();
