// src/services/MainAPI/customerApi.ts
import { BaseApi } from './baseApi';
import type {
    ApiResponse,
    PagedResult,
} from '@/types/common';
import type {
    Customer,
    CustomerAddress,
    Neighborhood,
    CustomerFilters,
    CreateCustomerDto,
    UpdateCustomerDto,
    CreateCustomerAddressDto,
    UpdateCustomerAddressDto,
} from '@/types/customer';
import { buildQueryParams } from './queryParams';

class CustomerApi extends BaseApi {
    async getCustomers(
        filters?: CustomerFilters, signal?: AbortSignal
    ): Promise<ApiResponse<PagedResult<Customer>>> {
        const params = buildQueryParams(filters, {
            Search: 'search',
            BranchId: 'branchId',
            Name: 'name',
            Phone: 'phone',
            WhatsAppUsername: 'whatsAppUsername',
            Active: 'active',
            Page: (value) => value.page ?? 1,
            PageSize: (value) => value.pageSize ?? 10,
            SortBy: 'sortBy',
            SortOrder: 'sortOrder',
        });

        return this.get<ApiResponse<PagedResult<Customer>>>('/customers', {
            params, signal,
        });
    }

    private async readCustomer<T>(url: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
        try { return (await this.api.get<ApiResponse<T>>(url, { signal })).data; }
        catch (cause: any) {
            if (signal?.aborted || cause?.code === 'ERR_CANCELED' || cause?.__CANCEL__ === true) throw cause;
            // Restoration must distinguish a temporary failure from denied/deleted data.
            throw Object.assign(this.handleError(cause), { status: cause?.response?.status });
        }
    }

    async getCustomerById(id: number, signal?: AbortSignal): Promise<ApiResponse<Customer>> {
        return this.readCustomer<Customer>(`/customers/${id}`, signal);
    }

    async getCustomerByPhone(phone: string): Promise<ApiResponse<Customer>> {
        return this.get<ApiResponse<Customer>>(`/customers/by-phone/${phone}`);
    }

    async createCustomer(
        payload: CreateCustomerDto
    ): Promise<ApiResponse<Customer>> {
        return this.post<ApiResponse<Customer>>('/customers', payload);
    }

    async updateCustomer(
        id: number,
        payload: UpdateCustomerDto
    ): Promise<ApiResponse<Customer>> {
        return this.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
    }

    async deleteCustomer(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/customers/${id}`);
    }

    async getCustomerAddresses(
        customerId: number, signal?: AbortSignal
    ): Promise<ApiResponse<CustomerAddress[]>> {
        return this.readCustomer<CustomerAddress[]>(`/customers/${customerId}/addresses`, signal);
    }

    async getCustomerAddressById(
        addressId: number
    ): Promise<ApiResponse<CustomerAddress>> {
        return this.get<ApiResponse<CustomerAddress>>(`/customers/addresses/${addressId}`);
    }

    async createCustomerAddress(
        customerId: number,
        payload: CreateCustomerAddressDto
    ): Promise<ApiResponse<CustomerAddress>> {
        return this.post<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses`, payload);
    }

    async updateCustomerAddress(
        customerId: number,
        addressId: number,
        payload: UpdateCustomerAddressDto
    ): Promise<ApiResponse<CustomerAddress>> {
        return this.put<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses/${addressId}`, payload);
    }

    async deleteCustomerAddress(
        customerId: number,
        addressId: number
    ): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/customers/${customerId}/addresses/${addressId}`);
    }

    async setPrimaryAddress(customerId: number, addressId: number): Promise<ApiResponse<CustomerAddress>> {
        return this.put<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses/${addressId}/set-primary`);
    }

    async getNeighborhoods(branchId?: number, forOrderAddress = false): Promise<ApiResponse<Neighborhood[]>> {
        return this.get<ApiResponse<Neighborhood[]>>('/customers/neighborhoods', {
            params: {
                ...(branchId ? { branchId } : {}),
                ...(forOrderAddress ? { forOrderAddress: true } : {}),
            },
        });
    }

    async createNeighborhood(payload: { name: string; deliveryFee: number; branchId: number }): Promise<ApiResponse<Neighborhood>> {
        return this.post<ApiResponse<Neighborhood>>(`/branches/${payload.branchId}/neighborhoods`, payload);
    }
}

export const customerApi = new CustomerApi();
