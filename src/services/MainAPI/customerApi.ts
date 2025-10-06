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

class CustomerApi extends BaseApi {
    // 1. Obtener clientes con filtros y paginación
    async getCustomers(
        filters?: CustomerFilters
    ): Promise<ApiResponse<PagedResult<Customer>>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.name) params.Name = filters.name;
            if (filters.phone) params.Phone = filters.phone;
            if (filters.active !== undefined) params.Active = filters.active;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<ApiResponse<PagedResult<Customer>>>('/customers', {
            params,
        });
    }

    // 2. Obtener cliente por ID
    async getCustomerById(id: number): Promise<ApiResponse<Customer>> {
        return this.get<ApiResponse<Customer>>(`/customers/${id}`);
    }

    // 3. Buscar cliente por teléfono
    async getCustomerByPhone(phone: string): Promise<ApiResponse<Customer>> {
        return this.get<ApiResponse<Customer>>(`/customers/by-phone/${phone}`);
    }

    // 4. Crear cliente
    async createCustomer(
        payload: CreateCustomerDto
    ): Promise<ApiResponse<Customer>> {
        return this.post<ApiResponse<Customer>>('/customers', payload);
    }

    // 5. Actualizar cliente
    async updateCustomer(
        id: number,
        payload: UpdateCustomerDto
    ): Promise<ApiResponse<Customer>> {
        return this.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
    }

    // 6. Eliminar cliente (soft delete)
    async deleteCustomer(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/customers/${id}`);
    }

    // 7. Obtener direcciones de cliente
    async getCustomerAddresses(
        customerId: number
    ): Promise<ApiResponse<CustomerAddress[]>> {
        return this.get<ApiResponse<CustomerAddress[]>>(`/customers/${customerId}/addresses`);
    }

    // 8. Crear dirección para cliente
    async createCustomerAddress(
        customerId: number,
        payload: CreateCustomerAddressDto
    ): Promise<ApiResponse<CustomerAddress>> {
        return this.post<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses`, payload);
    }

    // 9. Actualizar dirección de cliente
    async updateCustomerAddress(
        customerId: number,
        addressId: number,
        payload: UpdateCustomerAddressDto
    ): Promise<ApiResponse<CustomerAddress>> {
        return this.put<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses/${addressId}`, payload);
    }

    // 10. Eliminar dirección de cliente
    async deleteCustomerAddress(
        customerId: number,
        addressId: number
    ): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/customers/${customerId}/addresses/${addressId}`);
    }

    // 11. Obtener barrios por sucursal
    async getNeighborhoods(): Promise<ApiResponse<Neighborhood[]>> {
        return this.get<ApiResponse<Neighborhood[]>>('/customers/neighborhoods');
    }

    // 12. Crear barrio
    async createNeighborhood(payload: { name: string; deliveryFee: number; branchId: number }): Promise<ApiResponse<Neighborhood>> {
        return this.post<ApiResponse<Neighborhood>>(`/branches/${payload.branchId}/neighborhoods`, payload);
    }
}

export const customerApi = new CustomerApi();
