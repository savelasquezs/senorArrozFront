// src/services/MainAPI/expenseApi.ts
import { BaseApi } from './baseApi';
import type {
    ApiResponse,
    PagedResult,
} from '@/types/common';
import type {
    Expense,
    ExpenseFilters,
    CreateExpenseDto,
    UpdateExpenseDto,
} from '@/types/expense';

class ExpenseApi extends BaseApi {
    // 1. Obtener gastos con filtros y paginación
    async getExpenses(
        filters?: ExpenseFilters
    ): Promise<ApiResponse<PagedResult<Expense>>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.categoryId) params.CategoryId = filters.categoryId;
            if (filters.name) params.Name = filters.name;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<ApiResponse<PagedResult<Expense>>>('/expenses', {
            params,
        });
    }

    // 2. Obtener todos los gastos (sin paginación, para selectores)
    async getAllExpenses(): Promise<ApiResponse<Expense[]>> {
        return this.get<ApiResponse<Expense[]>>('/expenses/all');
    }

    // 3. Obtener gasto por ID
    async getExpenseById(id: number): Promise<ApiResponse<Expense>> {
        return this.get<ApiResponse<Expense>>(`/expenses/${id}`);
    }

    // 4. Crear gasto
    async createExpense(
        payload: CreateExpenseDto
    ): Promise<ApiResponse<Expense>> {
        return this.post<ApiResponse<Expense>>('/expenses', payload);
    }

    // 5. Actualizar gasto
    async updateExpense(
        id: number,
        payload: UpdateExpenseDto
    ): Promise<ApiResponse<Expense>> {
        return this.put<ApiResponse<Expense>>(`/expenses/${id}`, payload);
    }

    // 6. Eliminar gasto
    async deleteExpense(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/expenses/${id}`);
    }
}

export const expenseApi = new ExpenseApi();


