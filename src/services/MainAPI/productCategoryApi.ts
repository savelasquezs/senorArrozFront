// src/services/MainAPI/productCategoryApi.ts
import { BaseApi } from './baseApi';
import type {
    ApiResponse,
    PagedResult,
} from '@/types/common';
import type {
    ProductCategory,
    ProductCategoryFilters,
    CreateProductCategoryDto,
    UpdateProductCategoryDto,
} from '@/types/product';

class ProductCategoryApi extends BaseApi {
    // 1. Obtener categorías con filtros y paginación
    async getProductCategories(
        filters?: ProductCategoryFilters
    ): Promise<ApiResponse<PagedResult<ProductCategory>>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.name) params.Name = filters.name;
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<ApiResponse<PagedResult<ProductCategory>>>('/productcategories', {
            params,
        });
    }

    // 2. Obtener categoría por ID
    async getProductCategoryById(id: number): Promise<ApiResponse<ProductCategory>> {
        return this.get<ApiResponse<ProductCategory>>(`/productcategories/${id}`);
    }

    // 3. Crear categoría
    async createProductCategory(
        payload: CreateProductCategoryDto
    ): Promise<ApiResponse<ProductCategory>> {
        return this.post<ApiResponse<ProductCategory>>('/productcategories', payload);
    }

    // 4. Actualizar categoría
    async updateProductCategory(
        id: number,
        payload: UpdateProductCategoryDto
    ): Promise<ApiResponse<ProductCategory>> {
        return this.put<ApiResponse<ProductCategory>>(`/productcategories/${id}`, payload);
    }

    // 5. Eliminar categoría
    async deleteProductCategory(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/productcategories/${id}`);
    }
}

export const productCategoryApi = new ProductCategoryApi();

