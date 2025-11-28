// src/services/MainAPI/expenseHeaderApi.ts
import { BaseApi } from './baseApi'

import type {
    ExpenseHeader,
    ExpenseHeaderFilters,
    ExpenseHeaderListResult,
    CreateExpenseHeaderDto,
    UpdateExpenseHeaderDto,
} from '@/types/expense'

class ExpenseHeaderApi extends BaseApi {
    // 1. Obtener gastos con filtros y paginación
    async getExpenseHeaders(
        filters?: ExpenseHeaderFilters
    ): Promise<ExpenseHeaderListResult> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {}
        if (filters) {
            if (filters.fromDate) params.FromDate = filters.fromDate
            if (filters.toDate) params.ToDate = filters.toDate
            params.Page = filters.page || 1
            params.PageSize = filters.pageSize || 10
            if (filters.sortBy) params.SortBy = filters.sortBy
            if (filters.sortOrder) params.SortOrder = filters.sortOrder
        }

        return this.get<ExpenseHeaderListResult>('/expenseheaders', {
            params,
        })
    }

    // 2. Obtener gasto por ID
    async getExpenseHeaderById(id: number): Promise<ExpenseHeader> {
        return this.get<ExpenseHeader>(`/expenseheaders/${id}`)
    }

    // 3. Crear gasto
    async createExpenseHeader(
        payload: CreateExpenseHeaderDto
    ): Promise<ExpenseHeader> {
        return this.post<ExpenseHeader>('/expenseheaders', payload)
    }

    // 4. Actualizar gasto
    async updateExpenseHeader(
        id: number,
        payload: UpdateExpenseHeaderDto
    ): Promise<ExpenseHeader> {
        return this.put<ExpenseHeader>(`/expenseheaders/${id}`, payload)
    }

    // 5. Eliminar gasto
    async deleteExpenseHeader(id: number): Promise<void> {
        return this.delete<void>(`/expenseheaders/${id}`)
    }
}

export const expenseHeaderApi = new ExpenseHeaderApi()

