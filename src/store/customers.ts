import { defineStore } from 'pinia';
import { createLatestRead } from '@/helpers/latestRead';
import { useAuthStore } from '@/store/auth';
import { useBranchContextStore } from '@/store/branchContext';
import { computed, ref, watch } from 'vue';
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

const neighborhoodsKey = (branchId?: number | null, forOrderAddress = false) =>
    `${branchId && branchId > 0 ? branchId : 'default'}:${forOrderAddress ? 'order' : 'regular'}`;

type FetchOpts = ResourceActionOptions;

export const useCustomersStore = defineStore('customers', () => {
    let neighborhoodsLoadInFlight: Promise<void> | null = null;
    let neighborhoodsLoadInFlightKey: string | null = null;
    let neighborhoodsLoadedKey: string | null = null;
    let latestNeighborhoodsRequestKey: string | null = null;
    let neighborhoodsVersion = 0;
    const list = ref<PagedResult<Customer> | null>(null);
    const current = ref<Customer | null>(null);
    const addresses = ref<CustomerAddress[]>([]);
    const neighborhoods = ref<Neighborhood[]>([]);
    const { isLoading, error, run, clearError } = createResourceState();

    const currentAddresses = computed(() => addresses.value);
    const availableNeighborhoods = computed(() => neighborhoods.value);

    const listRead = createLatestRead();
    const detailRead = createLatestRead();
    const addressesRead = createLatestRead();

    const fetch = async (filters?: CustomerFilters, opts?: FetchOpts) => {
        await run(async () => {
            await listRead.load(JSON.stringify(filters ?? {}), signal => customerApi.getCustomers(filters, signal), res => { list.value = res.data; });
        }, { ...opts, errorMessage: 'Error al cargar clientes' });
    };

    const fetchById = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            await detailRead.load(String(id), signal => customerApi.getCustomerById(id, signal), res => { current.value = res.data; });
        }, { ...opts, errorMessage: 'Error al cargar el cliente' });
    };

    const searchByPhone = async (phone: string, branchId?: number, opts?: FetchOpts) => {
        return run(async () => {
            if (branchId) {
                const res = await customerApi.getCustomers({
                    branchId,
                    phone,
                    page: 1,
                    pageSize: 10,
                    active: true,
                });
                return res.data?.items?.[0] ?? null;
            }
            const res = await customerApi.getCustomerByPhone(phone);
            return res.data;
        }, { ...opts, errorMessage: 'Error al buscar cliente por telefono' });
    };

    const create = async (payload: CreateCustomerDto, opts?: FetchOpts) => {
        listRead.invalidate();
        return run(async () => {
            const res = await customerApi.createCustomer(payload);
            prependPagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear el cliente' });
    };

    const update = async (id: number, payload: UpdateCustomerDto, opts?: FetchOpts) => {
        listRead.invalidate();
        detailRead.invalidate();
        return run(async () => {
            const res = await customerApi.updateCustomer(id, payload);
            current.value = res.data;
            replacePagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al actualizar el cliente' });
    };

    const remove = async (id: number, opts?: FetchOpts) => {
        listRead.invalidate();
        detailRead.invalidate();
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
            await addressesRead.load(String(customerId), signal => customerApi.getCustomerAddresses(customerId, signal), res => { addresses.value = res.data; });
        }, { ...opts, errorMessage: 'Error al cargar direcciones' });
    };

    const fetchAddressById = async (addressId: number, opts?: FetchOpts) => {
        return run(async () => {
            const res = await customerApi.getCustomerAddressById(addressId);
            return res.data;
        }, { ...opts, errorMessage: 'Error al cargar la direccion' });
    };

    const createAddress = async (customerId: number, payload: CreateCustomerAddressDto, opts?: FetchOpts) => {
        addressesRead.invalidate();
        return run(async () => {
            const res = await customerApi.createCustomerAddress(customerId, payload);
            addresses.value.push(res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear la direccion' });
    };

    const updateAddress = async (customerId: number, addressId: number, payload: UpdateCustomerAddressDto, opts?: FetchOpts) => {
        addressesRead.invalidate();
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
        addressesRead.invalidate();
        await run(async () => {
            await customerApi.deleteCustomerAddress(customerId, addressId);
            addresses.value = addresses.value.filter(addr => addr.id !== addressId);
        }, { ...opts, errorMessage: 'Error al eliminar la direccion' });
    };

    const setPrimaryAddress = async (customerId: number, addressId: number, opts?: FetchOpts) => {
        addressesRead.invalidate();
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

    const fetchNeighborhoods = async (
        branchId?: number | null,
        forOrderAddress = false,
        opts?: FetchOpts,
    ) => {
        const normalizedBranchId = branchId && branchId > 0 ? branchId : null;
        const requestKey = neighborhoodsKey(normalizedBranchId, forOrderAddress);
        latestNeighborhoodsRequestKey = requestKey;
        const version = ++neighborhoodsVersion;
        await run(async () => {
            const res = await customerApi.getNeighborhoods(normalizedBranchId ?? undefined, forOrderAddress);
            if (latestNeighborhoodsRequestKey !== requestKey || version !== neighborhoodsVersion) return;
            neighborhoods.value = res.data;
            neighborhoodsLoadedKey = requestKey;
        }, { ...opts, errorMessage: 'Error al cargar barrios' });
    };

    const ensureNeighborhoodsLoaded = async (branchId?: number | null, forOrderAddress = false) => {
        const normalizedBranchId = branchId && branchId > 0 ? branchId : null;
        const requestKey = neighborhoodsKey(normalizedBranchId, forOrderAddress);
        latestNeighborhoodsRequestKey = requestKey;
        if (neighborhoodsLoadedKey === requestKey) {
            return;
        }
        if (neighborhoodsLoadInFlight && neighborhoodsLoadInFlightKey === requestKey) {
            return neighborhoodsLoadInFlight;
        }
        neighborhoods.value = [];
        let request!: Promise<void>;
        request = (async () => {
            try {
                await fetchNeighborhoods(normalizedBranchId, forOrderAddress);
            } finally {
                if (neighborhoodsLoadInFlight === request) {
                    neighborhoodsLoadInFlight = null;
                    neighborhoodsLoadInFlightKey = null;
                }
            }
        })();
        neighborhoodsLoadInFlight = request;
        neighborhoodsLoadInFlightKey = requestKey;
        return request;
    };

    const searchCustomersByName = async (name: string, branchId?: number): Promise<Customer[]> => {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            return [];
        }
        const res = await customerApi.getCustomers({
            branchId,
            name: trimmed,
            page: 1,
            pageSize: 100,
            active: true,
        });
        return res.data?.items ?? [];
    };

    const searchCustomers = async (search: string, branchId?: number): Promise<Customer[]> => {
        const trimmed = search.trim();
        if (trimmed.length < 2) return [];
        const res = await customerApi.getCustomers({
            search: trimmed,
            branchId,
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
        detailRead.invalidate(); addressesRead.invalidate();
        current.value = null;
        addresses.value = [];
        clearError();
    };

    const clearList = () => {
        listRead.invalidate();
        neighborhoodsVersion++;
        list.value = null;
        neighborhoods.value = [];
        neighborhoodsLoadedKey = null;
        neighborhoodsLoadInFlight = null;
        neighborhoodsLoadInFlightKey = null;
        latestNeighborhoodsRequestKey = null;
        clearError();
    };

    const auth = useAuthStore();
    const branches = useBranchContextStore();
    watch(() => [auth.user?.id, auth.user?.role, branches.revision], () => { clear(); clearList(); }, { flush: 'sync' });

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
        searchCustomers,
        createNeighborhood,
        clear,
        clearList
    };
});
