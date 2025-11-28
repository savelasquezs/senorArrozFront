// src/services/MainAPI/expenseCategoryApi.ts
import { BaseApi } from './baseApi';
import type {
    ApiResponse,
    PagedResult,
} from '@/types/common';
import type {
    ExpenseCategory,
    ExpenseCategoryFilters,
    CreateExpenseCategoryDto,
    UpdateExpenseCategoryDto,
} from '@/types/expense';

class ExpenseCategoryApi extends BaseApi {
    // 1. Obtener categorías con filtros y paginación
    async getExpenseCategories(
        filters?: ExpenseCategoryFilters
    ): Promise<ApiResponse<PagedResult<ExpenseCategory>>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.name) params.Name = filters.name;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<ApiResponse<PagedResult<ExpenseCategory>>>('/expensecategories', {
            params,
        });
    }

    // 2. Obtener todas las categorías (sin paginación, para selectores)
    async getAllExpenseCategories(): Promise<ApiResponse<ExpenseCategory[]>> {
        return this.get<ApiResponse<ExpenseCategory[]>>('/expensecategories/all');
    }

    // 3. Obtener categoría por ID
    async getExpenseCategoryById(id: number): Promise<ApiResponse<ExpenseCategory>> {
        return this.get<ApiResponse<ExpenseCategory>>(`/expensecategories/${id}`);
    }

    // 4. Crear categoría
    async createExpenseCategory(
        payload: CreateExpenseCategoryDto
    ): Promise<ApiResponse<ExpenseCategory>> {
        return this.post<ApiResponse<ExpenseCategory>>('/expensecategories', payload);
    }

    // 5. Actualizar categoría
    async updateExpenseCategory(
        id: number,
        payload: UpdateExpenseCategoryDto
    ): Promise<ApiResponse<ExpenseCategory>> {
        return this.put<ApiResponse<ExpenseCategory>>(`/expensecategories/${id}`, payload);
    }

    // 6. Eliminar categoría
    async deleteExpenseCategory(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/expensecategories/${id}`);
    }
}

export const expenseCategoryApi = new ExpenseCategoryApi();


