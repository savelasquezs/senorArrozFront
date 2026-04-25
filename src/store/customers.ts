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
import {
    createResourceState,
    prependPagedItem,
    removePagedItem,
    replacePagedItem,
    type ResourceActionOptions,
} from './helpers/resourceStore';

let neighborhoodsLoadInFlight: Promise<void> | null = null;

type FetchOpts = ResourceActionOptions;

export const useCustomersStore = defineStore('customers', () => {
    const list = ref<PagedResult<Customer> | null>(null);
    const current = ref<Customer | null>(null);
    const addresses = ref<CustomerAddress[]>([]);
    const neighborhoods = ref<Neighborhood[]>([]);
    const { isLoading, error, run, clearError } = createResourceState();

    const currentAddresses = computed(() => addresses.value);
    const availableNeighborhoods = computed(() => neighborhoods.value);

    const fetch = async (filters?: CustomerFilters, opts?: FetchOpts) => {
        await run(async () => {
            const res = await customerApi.getCustomers(filters);
            list.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar clientes' });
    };

    const fetchById = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            const res = await customerApi.getCustomerById(id);
            current.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar el cliente' });
    };

    const searchByPhone = async (phone: string, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.getCustomerByPhone(phone);
            return res.data;
        }, { ...opts, errorMessage: 'Error al buscar cliente por telefono' });
    };

    const create = async (payload: CreateCustomerDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.createCustomer(payload);
            prependPagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear el cliente' });
    };

    const update = async (id: number, payload: UpdateCustomerDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.updateCustomer(id, payload);
            current.value = res.data;
            replacePagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al actualizar el cliente' });
    };

    const remove = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            await customerApi.deleteCustomer(id);
            removePagedItem(list, id);

            if (current.value?.id === id) {
                current.value = null;
            }
        }, { ...opts, errorMessage: 'Error al eliminar el cliente' });
    };

    const fetchAddresses = async (customerId: number, opts?: FetchOpts) => {
        await run(async () => {
            const res = await customerApi.getCustomerAddresses(customerId);
            addresses.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar direcciones' });
    };

    const fetchAddressById = async (addressId: number, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.getCustomerAddressById(addressId);
            return res.data;
        }, { ...opts, errorMessage: 'Error al cargar la direccion' });
    };

    const createAddress = async (customerId: number, payload: CreateCustomerAddressDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.createCustomerAddress(customerId, payload);
            addresses.value.push(res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear la direccion' });
    };

    const updateAddress = async (customerId: number, addressId: number, payload: UpdateCustomerAddressDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.updateCustomerAddress(customerId, addressId, payload);
            const index = addresses.value.findIndex(addr => addr.id === addressId);
            if (index !== -1) {
                addresses.value[index] = res.data;
            }
            return res.data;
        }, { ...opts, errorMessage: 'Error al actualizar la direccion' });
    };

    const removeAddress = async (customerId: number, addressId: number, opts?: FetchOpts) => {
        await run(async () => {
            await customerApi.deleteCustomerAddress(customerId, addressId);
            addresses.value = addresses.value.filter(addr => addr.id !== addressId);
        }, { ...opts, errorMessage: 'Error al eliminar la direccion' });
    };

    const setPrimaryAddress = async (customerId: number, addressId: number, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.setPrimaryAddress(customerId, addressId);
            const addressIndex = addresses.value.findIndex(addr => addr.id === addressId);
            if (addressIndex !== -1) {
                addresses.value.forEach(addr => {
                    addr.isPrimary = false;
                });
                addresses.value[addressIndex] = res.data;
            }
            return res.data;
        }, { ...opts, errorMessage: 'Error al establecer direccion como principal' });
    };

    const fetchNeighborhoods = async (opts?: FetchOpts) => {
        await run(async () => {
            const res = await customerApi.getNeighborhoods();
            neighborhoods.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar barrios' });
    };

    const ensureNeighborhoodsLoaded = async () => {
        if (neighborhoods.value.length > 0) {
            return;
        }
        if (neighborhoodsLoadInFlight) {
            return neighborhoodsLoadInFlight;
        }
        neighborhoodsLoadInFlight = (async () => {
            try {
                await fetchNeighborhoods();
            } finally {
                neighborhoodsLoadInFlight = null;
            }
        })();
        return neighborhoodsLoadInFlight;
    };

    const searchCustomersByName = async (name: string): Promise<Customer[]> => {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            return [];
        }
        const res = await customerApi.getCustomers({
            name: trimmed,
            page: 1,
            pageSize: 100,
            active: true,
        });
        return res.data?.items ?? [];
    };

    const createNeighborhood = async (payload: { name: string; deliveryFee: number; branchId: number }, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.createNeighborhood(payload);
            neighborhoods.value.push(res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear barrio' });
    };

    const clear = () => {
        current.value = null;
        addresses.value = [];
        clearError();
    };

    const clearList = () => {
        list.value = null;
        clearError();
    };

    return {
        list,
        current,
        addresses,
        neighborhoods,
        isLoading,
        error,
        currentAddresses,
        availableNeighborhoods,
        fetch,
        fetchById,
        searchByPhone,
        create,
        update,
        remove,
        fetchAddresses,
        fetchAddressById,
        createAddress,
        updateAddress,
        removeAddress,
        setPrimaryAddress,
        fetchNeighborhoods,
        ensureNeighborhoodsLoaded,
        searchCustomersByName,
        createNeighborhood,
        clear,
        clearList
    };
});
