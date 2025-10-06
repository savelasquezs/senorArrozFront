// src/types/product.ts

export interface Product {
    id: number;
    categoryId: number;
    categoryName: string;
    branchId: number;
    branchName: string;
    name: string;
    price: number;
    stock: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProductDetail extends Product {
    totalSales: number;
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    lastSoldAt?: string;
}

export interface ProductCategory {
    id: number;
    branchId: number;
    branchName: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    totalProducts: number;
    activeProducts: number;
}

// DTOs para crear/actualizar
export interface CreateProductDto {
    categoryId: number;
    name: string;
    price: number;
    stock?: number;
    active?: boolean;
}

export interface UpdateProductDto {
    categoryId?: number;
    name?: string;
    price?: number;
    stock?: number;
    active?: boolean;
}

export interface CreateProductCategoryDto {
    name: string;
    branchId?: number; // Solo para superadmin
}

export interface UpdateProductCategoryDto {
    name?: string;
}

// Filtros para búsqueda
export interface ProductFilters {
    name?: string;
    categoryId?: number;
    branchId?: number;
    active?: boolean;
    minPrice?: number;
    maxPrice?: number;
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ProductCategoryFilters {
    name?: string;
    branchId?: number;
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Formularios locales
export interface ProductFormData {
    categoryId: number;
    name: string;
    price: number;
    stock?: number; // Optional for editing existing products
    active: boolean;
}

export interface ProductCategoryFormData {
    name: string;
}

// Stock adjustment
export interface StockAdjustmentDto {
    quantity: number;
}

