// src/types/customer.ts

export interface Customer {
    id: number;
    name: string;
    phone1: string;
    phone2?: string;
    branchId: number;
    branchName?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    totalOrders?: number;
    lastOrderDate?: string;
    addresses?: CustomerAddress[];
}

export interface CustomerAddress {
    id: number;
    customerId: number;
    neighborhoodId: number;
    neighborhoodName?: string;
    address: string;
    additionalInfo?: string;
    latitude?: number;
    longitude?: number;
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
    deliveryFee: number;
    neighborhood?: Neighborhood;
}

export interface Neighborhood {
    id: number;
    branchId: number;
    name: string;
    deliveryFee: number;
    createdAt: string;
    updatedAt: string;
}

// DTOs para crear/actualizar
export interface CreateCustomerDto {
    name: string;
    phone1: string;
    phone2?: string;
    branchId: number;
    initialAddress: {
        neighborhoodId: number;
        address: string;
        additionalInfo?: string;
        latitude: number;
        longitude: number;
        isPrimary: boolean;
        deliveryFee: number;
    };
}

export interface UpdateCustomerDto {
    name?: string;
    phone1?: string;
    phone2?: string;
    active?: boolean;
}

export interface CreateCustomerAddressDto {
    neighborhoodId: number;
    address: string;
    additionalInfo?: string;
    latitude?: number;
    longitude?: number;
    isPrimary: boolean;
    deliveryFee: number;
}

export interface UpdateCustomerAddressDto {
    neighborhoodId?: number;
    address?: string;
    additionalInfo?: string;
    latitude?: number;
    longitude?: number;
    isPrimary?: boolean;
    deliveryFee?: number;
}

// Filtros para búsqueda
export interface CustomerFilters {
    name?: string;
    phone?: string;
    branchId?: number;
    active?: boolean;
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Formularios locales
export interface CustomerFormData {
    name: string;
    phone1: string;
    phone2?: string;
    branchId: number;
    active: boolean;
    initialAddress?: {
        neighborhoodId: number;
        address: string;
        additionalInfo?: string;
        latitude?: number;
        longitude?: number;
        isPrimary?: boolean;
        deliveryFee: number;
    };
}

export interface CustomerAddressFormData {
    neighborhoodId: number;
    address: string;
    additionalInfo?: string;
    latitude?: number;
    longitude?: number;
    isPrimary: boolean;
    deliveryFee: number;
}

export interface NeighborhoodFormData {
    name: string;
    deliveryFee: number;
}
