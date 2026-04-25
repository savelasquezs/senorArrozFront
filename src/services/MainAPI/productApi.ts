// src/services/MainAPI/productApi.ts
import { BaseApi } from './baseApi';
import type {
    ApiResponse,
    PagedResult,
} from '@/types/common';
import type {
    Product,
    ProductDetail,
    ProductFilters,
    CreateProductDto,
    UpdateProductDto,
    StockAdjustmentDto,
} from '@/types/product';
import { buildQueryParams } from './queryParams';

class ProductApi extends BaseApi {
    async getProducts(
        filters?: ProductFilters
    ): Promise<ApiResponse<PagedResult<Product>>> {
        const params = buildQueryParams(filters, {
            Name: 'name',
            CategoryId: 'categoryId',
            BranchId: 'branchId',
            Active: 'active',
            MinPrice: 'minPrice',
            MaxPrice: 'maxPrice',
            Page: (value) => value.page ?? 1,
            PageSize: (value) => value.pageSize ?? 10,
            SortBy: 'sortBy',
            SortOrder: 'sortOrder',
        });

        return this.get<ApiResponse<PagedResult<Product>>>('/products', {
            params,
        });
    }

    async getProductById(id: number): Promise<ApiResponse<Product>> {
        return this.get<ApiResponse<Product>>(`/products/${id}`);
    }

    async getProductDetail(id: number): Promise<ApiResponse<ProductDetail>> {
        return this.get<ApiResponse<ProductDetail>>(`/products/${id}/detail`);
    }

    async createProduct(
        payload: CreateProductDto
    ): Promise<ApiResponse<Product>> {
        return this.post<ApiResponse<Product>>('/products', payload);
    }

    async updateProduct(
        id: number,
        payload: UpdateProductDto
    ): Promise<ApiResponse<Product>> {
        return this.put<ApiResponse<Product>>(`/products/${id}`, payload);
    }

    async deleteProduct(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/products/${id}`);
    }

    async adjustStock(
        id: number,
        payload: StockAdjustmentDto
    ): Promise<ApiResponse<number>> {
        return this.put<ApiResponse<number>>(`/products/${id}/stock`, payload);
    }
}

export const productApi = new ProductApi();
