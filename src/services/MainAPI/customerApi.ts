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
        filters?: CustomerFilters
    ): Promise<ApiResponse<PagedResult<Customer>>> {
        const params = buildQueryParams(filters, {
            BranchId: 'branchId',
            Name: 'name',
            Phone: 'phone',
            Active: 'active',
            Page: (value) => value.page ?? 1,
            PageSize: (value) => value.pageSize ?? 10,
            SortBy: 'sortBy',
            SortOrder: 'sortOrder',
        });

        return this.get<ApiResponse<PagedResult<Customer>>>('/customers', {
            params,
        });
    }

    async getCustomerById(id: number): Promise<ApiResponse<Customer>> {
        return this.get<ApiResponse<Customer>>(`/customers/${id}`);
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
        customerId: number
    ): Promise<ApiResponse<CustomerAddress[]>> {
        return this.get<ApiResponse<CustomerAddress[]>>(`/customers/${customerId}/addresses`);
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

    async getNeighborhoods(): Promise<ApiResponse<Neighborhood[]>> {
        return this.get<ApiResponse<Neighborhood[]>>('/customers/neighborhoods');
    }

    async createNeighborhood(payload: { name: string; deliveryFee: number; branchId: number }): Promise<ApiResponse<Neighborhood>> {
        return this.post<ApiResponse<Neighborhood>>(`/branches/${payload.branchId}/neighborhoods`, payload);
    }
}

export const customerApi = new CustomerApi();
