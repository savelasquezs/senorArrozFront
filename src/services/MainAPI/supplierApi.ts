import { BaseApi } from './baseApi'
import type { Supplier, SupplierFilters, SupplierListResult, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier'

class SupplierApi extends BaseApi {
    async getSuppliers(filters?: SupplierFilters): Promise<SupplierListResult> {
        const params: Record<string, unknown> = {}

        if (filters) {
            if (filters.search) params.Search = filters.search
            if (filters.branchId !== undefined) params.BranchId = filters.branchId
            params.Page = filters.page ?? 1
            params.PageSize = filters.pageSize ?? 10
            if (filters.sortBy) params.SortBy = filters.sortBy
            if (filters.sortOrder) params.SortOrder = filters.sortOrder
        }

        return this.get<SupplierListResult>('/suppliers', { params })
    }

    async getSuppliersByBranch(branchId?: number): Promise<Supplier[]> {
        const params: Record<string, unknown> = {}
        if (branchId !== undefined) params.BranchId = branchId
        return this.get<Supplier[]>('/suppliers/by-branch', { params })
    }

    async getSupplierById(id: number): Promise<Supplier> {
        return this.get<Supplier>(`/suppliers/${id}`)
    }

    async createSupplier(payload: CreateSupplierDto, branchId?: number): Promise<Supplier> {
        const params: Record<string, unknown> = {}
        if (branchId !== undefined) params.BranchId = branchId
        return this.post<Supplier>('/suppliers', payload, { params })
    }

    async updateSupplier(id: number, payload: UpdateSupplierDto): Promise<Supplier> {
        return this.put<Supplier>(`/suppliers/${id}`, payload)
    }

    async deleteSupplier(id: number): Promise<void> {
        await this.delete<void>(`/suppliers/${id}`)
    }
}

export const supplierApi = new SupplierApi()


