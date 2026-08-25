export type StorefrontRole = 'rice' | 'combo' | 'beverage' | 'addition' | 'hidden'

export interface Product {
    id: number
    categoryId: number
    categoryName: string
    branchId: number
    branchName: string
    name: string
    price: number
    stock: number | null
    weightGrams?: number | null
    active: boolean
    commercialProfileId?: number | null
    commercialProfileName?: string | null
    description?: string | null
    ingredients?: string | null
    photoUrl?: string | null
    servesPeopleMin?: number | null
    servesPeopleMax?: number | null
    storefrontVariantLabel?: string | null
    storefrontSortOrder?: number
    createdAt: string
    updatedAt: string
}

export interface ProductSalesUnitsEvolutionPoint { bucketStart: string; unitsSold: number }

export interface ProductDetail extends Product {
    totalSales: number
    totalRevenue: number
    totalOrders: number
    totalCustomers: number
    lastSoldAt?: string
    salesUnitsEvolution?: ProductSalesUnitsEvolutionPoint[]
}

export interface ProductCategory {
    id: number
    branchId: number
    branchName: string
    name: string
    storefrontRole: StorefrontRole
    createdAt: string
    updatedAt: string
    totalProducts: number
    activeProducts: number
}

export interface CreateProductDto {
    categoryId: number
    name: string
    price: number
    stock?: number | null
    weightGrams?: number | null
    active?: boolean
    commercialProfileId?: number | null
    servesPeopleMin?: number | null
    servesPeopleMax?: number | null
    storefrontVariantLabel?: string | null
    storefrontSortOrder?: number
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface CreateProductCategoryDto { name: string; storefrontRole?: StorefrontRole; branchId?: number }
export interface UpdateProductCategoryDto { name?: string; storefrontRole?: StorefrontRole }

export interface ProductFilters {
    name?: string
    categoryId?: number
    branchId?: number
    active?: boolean
    minPrice?: number
    maxPrice?: number
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface ProductCategoryFilters {
    name?: string
    branchId?: number
    page: number
    pageSize: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface ProductFormData {
    categoryId: number
    name: string
    price: number
    stock?: number | null
    weightGrams?: number | null
    active: boolean
    commercialProfileId?: number | null
    servesPeopleMin?: number | null
    servesPeopleMax?: number | null
    storefrontVariantLabel?: string | null
    storefrontSortOrder: number
}

export interface CommercialProfile {
    id: number
    branchId: number
    name: string
    description?: string | null
    ingredients?: string | null
    photoUrl?: string | null
}

export interface SaveCommercialProfileDto {
    branchId: number
    name: string
    description?: string | null
    ingredients?: string | null
}

export interface ProductCategoryFormData { name: string; storefrontRole: StorefrontRole }
export interface StockAdjustmentDto { quantity: number }
