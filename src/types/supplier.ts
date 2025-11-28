import type { PagedResult } from './common'

export interface Supplier {
    id: number
    branchId: number
    branchName: string
    name: string
    phone: string
    address?: string | null
    email?: string | null
    createdAt: string
    updatedAt: string
}

export interface CreateSupplierDto {
    name: string
    phone: string
    address?: string
    email?: string
}

export interface UpdateSupplierDto {
    name?: string
    phone?: string
    address?: string | null
    email?: string | null
}

export interface SupplierFilters {
    search?: string
    branchId?: number
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export type SupplierListResult = PagedResult<Supplier>


