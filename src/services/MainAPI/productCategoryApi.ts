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
import { buildQueryParams } from './queryParams';

class ProductCategoryApi extends BaseApi {
    async getProductCategories(
        filters?: ProductCategoryFilters
    ): Promise<ApiResponse<PagedResult<ProductCategory>>> {
        const params = buildQueryParams(filters, {
            Name: 'name',
            BranchId: 'branchId',
            Page: (value) => value.page ?? 1,
            PageSize: (value) => value.pageSize ?? 10,
            SortBy: 'sortBy',
            SortOrder: 'sortOrder',
        });

        return this.get<ApiResponse<PagedResult<ProductCategory>>>('/productcategories', {
            params,
            branchScope: 'none',
        });
    }

    async getProductCategoryById(id: number): Promise<ApiResponse<ProductCategory>> {
        return this.get<ApiResponse<ProductCategory>>(`/productcategories/${id}`, { branchScope: 'none' });
    }

    async createProductCategory(
        payload: CreateProductCategoryDto
    ): Promise<ApiResponse<ProductCategory>> {
        return this.post<ApiResponse<ProductCategory>>('/productcategories', payload, { branchScope: 'none' });
    }

    async updateProductCategory(
        id: number,
        payload: UpdateProductCategoryDto
    ): Promise<ApiResponse<ProductCategory>> {
        return this.put<ApiResponse<ProductCategory>>(`/productcategories/${id}`, payload, { branchScope: 'none' });
    }

    async deleteProductCategory(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/productcategories/${id}`, { branchScope: 'none' });
    }
}

export const productCategoryApi = new ProductCategoryApi();
