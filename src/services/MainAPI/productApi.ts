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

class ProductApi extends BaseApi {
    // 1. Obtener productos con filtros y paginación
    async getProducts(
        filters?: ProductFilters
    ): Promise<ApiResponse<PagedResult<Product>>> {
        // Mapear parámetros de frontend (camelCase) a backend (PascalCase)
        const params: any = {};
        if (filters) {
            if (filters.name) params.Name = filters.name;
            if (filters.categoryId !== undefined) params.CategoryId = filters.categoryId;
            if (filters.branchId !== undefined) params.BranchId = filters.branchId;
            if (filters.active !== undefined) params.Active = filters.active;
            if (filters.minPrice !== undefined) params.MinPrice = filters.minPrice;
            if (filters.maxPrice !== undefined) params.MaxPrice = filters.maxPrice;
            params.Page = filters.page || 1;
            params.PageSize = filters.pageSize || 10;
            if (filters.sortBy) params.SortBy = filters.sortBy;
            if (filters.sortOrder) params.SortOrder = filters.sortOrder;
        }

        return this.get<ApiResponse<PagedResult<Product>>>('/products', {
            params,
        });
    }

    // 2. Obtener producto por ID
    async getProductById(id: number): Promise<ApiResponse<Product>> {
        return this.get<ApiResponse<Product>>(`/products/${id}`);
    }

    // 3. Obtener detalles del producto con estadísticas
    async getProductDetail(id: number): Promise<ApiResponse<ProductDetail>> {
        return this.get<ApiResponse<ProductDetail>>(`/products/${id}/detail`);
    }

    // 4. Crear producto
    async createProduct(
        payload: CreateProductDto
    ): Promise<ApiResponse<Product>> {
        return this.post<ApiResponse<Product>>('/products', payload);
    }

    // 5. Actualizar producto
    async updateProduct(
        id: number,
        payload: UpdateProductDto
    ): Promise<ApiResponse<Product>> {
        return this.put<ApiResponse<Product>>(`/products/${id}`, payload);
    }

    // 6. Eliminar producto
    async deleteProduct(id: number): Promise<ApiResponse<string>> {
        return this.delete<ApiResponse<string>>(`/products/${id}`);
    }

    // 7. Ajustar stock
    async adjustStock(
        id: number,
        payload: StockAdjustmentDto
    ): Promise<ApiResponse<number>> {
        return this.put<ApiResponse<number>>(`/products/${id}/stock`, payload);
    }
}

export const productApi = new ProductApi();

