import { BaseApi } from './baseApi'
import type { Supplier, SupplierFilters, SupplierListResult, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier'
import type { SupplierExpenseSuggestion } from '@/types/expense'

class SupplierApi extends BaseApi {
    async getSuppliers(filters?: SupplierFilters): Promise<SupplierListResult> {
        const params: Record<string, unknown> = {}

        if (filters) {
            if (filters.search) params.Search = filters.search
            params.Page = filters.page ?? 1
            params.PageSize = filters.pageSize ?? 10
            if (filters.sortBy) params.SortBy = filters.sortBy
            if (filters.sortOrder) params.SortOrder = filters.sortOrder
        }

        return this.get<SupplierListResult>('/suppliers', { params })
    }

    async getSuppliersByBranch(): Promise<Supplier[]> {
        return this.get<Supplier[]>('/suppliers/by-branch')
    }

    async getSupplierById(id: number): Promise<Supplier> {
        return this.get<Supplier>(`/suppliers/${id}`)
    }

    async createSupplier(payload: CreateSupplierDto): Promise<Supplier> {
        return this.post<Supplier>('/suppliers', payload)
    }

    async updateSupplier(id: number, payload: UpdateSupplierDto): Promise<Supplier> {
        return this.put<Supplier>(`/suppliers/${id}`, payload)
    }

    async deleteSupplier(id: number): Promise<void> {
        await this.delete<void>(`/suppliers/${id}`)
    }

    async getSupplierExpenses(supplierId: number): Promise<SupplierExpenseSuggestion[]> {
        return this.get<SupplierExpenseSuggestion[]>(`/suppliers/${supplierId}/expenses`)
    }
}

export const supplierApi = new SupplierApi()


