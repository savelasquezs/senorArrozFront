import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useAuthStore } from './auth';
import { loadPagedCatalog } from '@/helpers/loadPagedCatalog';
import { productApi } from '@/services/MainAPI/productApi';
import { inventoryApi } from '@/services/MainAPI/inventoryApi';
import type {
    Product,
    ProductDetail,
    ProductFilters,
    CreateProductDto,
    UpdateProductDto,
    StockAdjustmentDto
} from '@/types/product';
import type { PagedResult } from '@/types/common';
import {
    createResourceState,
    prependPagedItem,
    removePagedItem,
    replacePagedItem,
    type ResourceActionOptions,
} from './helpers/resourceStore';

export const ORDER_CATALOG_PRODUCT_PAGE_SIZE = 150;

type FetchOpts = ResourceActionOptions;

export const useProductsStore = defineStore('products', () => {
    const list = ref<PagedResult<Product> | null>(null);
    const catalogProducts = ref<Product[]>([]);
    const catalogBranchId = ref<number | null>(null);
    const catalogLoading = ref(false);
    const catalogLoaded = ref(false);
    const catalogError = ref<string | null>(null);
    const auth = useAuthStore();
    let catalogVersion = 0, catalogKey = '';
    let catalogLoadInFlight: Promise<void> | null = null;
    function invalidateCatalog() { catalogVersion++; catalogLoaded.value = false; catalogLoadInFlight = null; }
    watch(() => [auth.user?.id, auth.user?.role, auth.user?.branchId].join(':'), () => {
        invalidateCatalog(); catalogProducts.value = []; catalogError.value = null; catalogLoading.value = false;
    }, { flush: 'sync' });
    const current = ref<Product | null>(null);
    const currentDetail = ref<ProductDetail | null>(null);
    const { isLoading, error, run, clearError } = createResourceState();

    const currentProducts = computed(() => list.value?.items || []);
    const totalProducts = computed(() => list.value?.totalCount || 0);
    let listVersion = 0;

    const fetch = async (filters?: ProductFilters, opts?: FetchOpts) => {
        const version = ++listVersion;
        await run(async () => {
            const res = await productApi.getProducts(filters);
            if (version !== listVersion) return;
            list.value = res.data;
            const controlled = res.data?.items?.filter(product => product.inventoryEnabled) ?? [];
            if (controlled.length) {
                void inventoryApi.getAvailability(controlled.map(product => product.id)).then(availability => {
                    if (version !== listVersion) return;
                    const byProduct = new Map(availability.map(item => [item.productId, item]));
                    list.value!.items = list.value!.items.map(product => {
                        const item = byProduct.get(product.id);
                        if (!item || item.controlMode === 'estimated') return product;
                        return { ...product, stock: item.maximumQuantity ?? (item.available ? null : 0) };
                    });
                }).catch(() => {});
            }
        }, { ...opts, errorMessage: 'Error al cargar productos' });
    };

    const ensureCatalogLoaded = async (branchId?: number | null, force = false) => {
        const key = `${auth.user?.id}:${auth.user?.role}:${branchId ?? auth.user?.branchId}`;
        if (key !== catalogKey) {
            invalidateCatalog(); catalogKey = key; catalogProducts.value = []; catalogBranchId.value = branchId ?? auth.user?.branchId ?? null;
        }
        if (!force && catalogLoaded.value) return;
        if (catalogLoadInFlight) return catalogLoadInFlight;
        const version = ++catalogVersion;
        catalogLoading.value = true; catalogError.value = null;
        const request = (async () => {
            try {
                await loadPagedCatalog<Product>(async page => {
                    const response = await productApi.getProducts({ page, pageSize: ORDER_CATALOG_PRODUCT_PAGE_SIZE, active: true });
                    return response.data;
                }, items => {
                    if (version === catalogVersion) catalogProducts.value = items.map(product => ({
                        ...product, availabilityPending: product.inventoryEnabled && product.inventoryControlMode === 'strict',
                    }));
                });
                if (version !== catalogVersion) return;
                if (!catalogProducts.value.length) { catalogLoaded.value = true; return; }
                const controlled = catalogProducts.value.filter(product => product.inventoryEnabled);
                const availability = [] as Awaited<ReturnType<typeof inventoryApi.getAvailability>>;
                for (let offset = 0; offset < controlled.length; offset += 100) {
                    if (version !== catalogVersion) return;
                    availability.push(...await inventoryApi.getAvailability(controlled.slice(offset, offset + 100).map(product => product.id), catalogBranchId.value, true));
                }
                if (version !== catalogVersion) return;
                const byProduct = new Map(availability.map(item => [item.productId, item]));
                catalogProducts.value = catalogProducts.value.map(product => {
                    const item = byProduct.get(product.id);
                    if (!item || item.controlMode === 'estimated') return product;
                    return { ...product, availabilityPending: false, stock: item.maximumQuantity ?? (item.available ? null : 0) };
                });
                if (catalogProducts.value.some(product => product.availabilityPending)) throw new Error('No se pudo confirmar la disponibilidad de algunos productos.');
                catalogLoaded.value = true;
            } catch (error) {
                if (version === catalogVersion) catalogError.value = error instanceof Error ? error.message : 'No se pudo cargar el catálogo.';
                throw error;
            } finally {
                if (version === catalogVersion) { catalogLoadInFlight = null; catalogLoading.value = false; }
            }
        })();
        catalogLoadInFlight = request;
        return request;
    };

    const fetchById = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            const res = await productApi.getProductById(id);
            current.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar el producto' });
    };

    const fetchDetail = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            const res = await productApi.getProductDetail(id);
            currentDetail.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar los detalles del producto' });
    };

    const create = async (payload: CreateProductDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await productApi.createProduct(payload);
            invalidateCatalog();
            prependPagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear el producto' });
    };

    const update = async (id: number, payload: UpdateProductDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await productApi.updateProduct(id, payload);
            invalidateCatalog();
            current.value = res.data;
            replacePagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al actualizar el producto' });
    };

    const remove = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            await productApi.deleteProduct(id);
            invalidateCatalog();
            removePagedItem(list, id);

            if (current.value?.id === id) {
                current.value = null;
                currentDetail.value = null;
            }
        }, { ...opts, errorMessage: 'Error al eliminar el producto' });
    };

    const adjustStock = async (id: number, payload: StockAdjustmentDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await productApi.adjustStock(id, payload);
            invalidateCatalog();

            const listRow = list.value?.items.find((product) => product.id === id);
            if (listRow) {
                listRow.stock = (listRow.stock ?? 0) + payload.quantity;
            }

            if (current.value?.id === id) {
                current.value.stock = (current.value.stock ?? 0) + payload.quantity;
            }

            return res.data;
        }, { ...opts, errorMessage: 'Error al ajustar el stock' });
    };

    const clear = () => {
        current.value = null;
        currentDetail.value = null;
        clearError();
    };

    const clearList = () => {
        listVersion++;
        list.value = null;
        clearError();
    };

    return {
        list,
        catalogProducts,
        catalogBranchId,
        catalogLoading,
        catalogLoaded,
        catalogError,
        invalidateCatalog,
        current,
        currentDetail,
        isLoading,
        error,
        currentProducts,
        totalProducts,
        fetch,
        ensureCatalogLoaded,
        fetchById,
        fetchDetail,
        create,
        update,
        remove,
        adjustStock,
        clear,
        clearList
    };
});
