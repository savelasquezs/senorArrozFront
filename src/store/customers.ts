import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { customerApi } from '@/services/MainAPI/customerApi';
import type {
    Customer,
    CustomerAddress,
    Neighborhood,
    CustomerFilters,
    CreateCustomerDto,
    UpdateCustomerDto,
    CreateCustomerAddressDto,
    UpdateCustomerAddressDto
} from '@/types/customer';
import type { PagedResult } from '@/types/common';

export const useCustomersStore = defineStore('customers', () => {
    const list = ref<PagedResult<Customer> | null>(null);
    const current = ref<Customer | null>(null);
    const addresses = ref<CustomerAddress[]>([]);
    const neighborhoods = ref<Neighborhood[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const currentAddresses = computed(() => addresses.value);
    const availableNeighborhoods = computed(() => neighborhoods.value);

    // Fetch customers with filters
    const fetch = async (filters?: CustomerFilters) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.getCustomers(filters);
            list.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar clientes';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch customer by ID
    const fetchById = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.getCustomerById(id);
            current.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar el cliente';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Search customer by phone
    const searchByPhone = async (phone: string) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.getCustomerByPhone(phone);
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al buscar cliente por teléfono';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Create customer
    const create = async (payload: CreateCustomerDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.createCustomer(payload);
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al crear el cliente';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Update customer
    const update = async (id: number, payload: UpdateCustomerDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.updateCustomer(id, payload);
            current.value = res.data;
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al actualizar el cliente';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Delete customer
    const remove = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            await customerApi.deleteCustomer(id);
        } catch (err: any) {
            error.value = err.message || 'Error al eliminar el cliente';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch customer addresses
    const fetchAddresses = async (customerId: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.getCustomerAddresses(customerId);
            addresses.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar direcciones';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Create customer address
    const createAddress = async (customerId: number, payload: CreateCustomerAddressDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.createCustomerAddress(customerId, payload);
            // Refresh addresses list
            await fetchAddresses(customerId);
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al crear la dirección';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Update customer address
    const updateAddress = async (customerId: number, addressId: number, payload: UpdateCustomerAddressDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.updateCustomerAddress(customerId, addressId, payload);
            // Refresh addresses list
            await fetchAddresses(customerId);
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al actualizar la dirección';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Delete customer address
    const removeAddress = async (customerId: number, addressId: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            await customerApi.deleteCustomerAddress(customerId, addressId);
            // Refresh addresses list
            await fetchAddresses(customerId);
        } catch (err: any) {
            error.value = err.message || 'Error al eliminar la dirección';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch neighborhoods
    const fetchNeighborhoods = async () => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await customerApi.getNeighborhoods();
            neighborhoods.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar barrios';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Clear state
    const clear = () => {
        current.value = null;
        addresses.value = [];
        error.value = null;
    };

    const clearList = () => {
        list.value = null;
        error.value = null;
    };

    return {
        // State
        list,
        current,
        addresses,
        neighborhoods,
        isLoading,
        error,

        // Computed
        currentAddresses,
        availableNeighborhoods,

        // Actions
        fetch,
        fetchById,
        searchByPhone,
        create,
        update,
        remove,
        fetchAddresses,
        createAddress,
        updateAddress,
        removeAddress,
        fetchNeighborhoods,
        clear,
        clearList
    };
});
