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
        return this.get<ApiResponse<PagedResult<Customer>>>('/customers', {
            params: filters,
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
}

export const customerApi = new CustomerApi();
