// src/types/customer.ts

export interface Customer {
    id: number;
    name: string;
    phone1?: string | null;
    phone2?: string | null;
    whatsAppUsername?: string | null;
    hasWhatsAppIdentity?: boolean;
    branchId: number;
    branchName?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    totalOrders?: number;
    /** Primer pedido no cancelado. */
    firstOrderDate?: string;
    lastOrderDate?: string;
    /** Suma de totales de pedidos no cancelados. */
    totalAccumulated?: number;
    /** Pedidos entregados con cliente (derivado en API). */
    loyaltyDeliveredCount?: number;
    loyaltyNextStepIndex?: number | null;
    loyaltyNextRewardLabel?: string | null;
    loyaltyDeliveriesUntilNextReward?: number | null;
    loyaltyRewardDueOnCurrentOrder?: boolean;
    /** Mensaje listo para mostrar al tomar pedido. */
    loyaltyNextRewardMessage?: string | null;
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
    phone1?: string | null;
    phone2?: string;
    whatsAppUsername?: string | null;
    branchId: number;
    initialAddress?: {
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
    whatsAppUsername?: string | null;
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
    search?: string;
    name?: string;
    phone?: string;
    whatsAppUsername?: string;
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
    phone1?: string;
    phone2?: string;
    whatsAppUsername?: string;
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
