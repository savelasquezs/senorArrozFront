import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { productApi } from '@/services/MainAPI/productApi';
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

let catalogLoadInFlight: Promise<void> | null = null;

type FetchOpts = ResourceActionOptions;

export const useProductsStore = defineStore('products', () => {
    const list = ref<PagedResult<Product> | null>(null);
    const current = ref<Product | null>(null);
    const currentDetail = ref<ProductDetail | null>(null);
    const { isLoading, error, run, clearError } = createResourceState();

    const currentProducts = computed(() => list.value?.items || []);
    const totalProducts = computed(() => list.value?.totalCount || 0);

    const fetch = async (filters?: ProductFilters, opts?: FetchOpts) => {
        await run(async () => {
            const res = await productApi.getProducts(filters);
            list.value = res.data;
        }, { ...opts, errorMessage: 'Error al cargar productos' });
    };

    const ensureCatalogLoaded = async () => {
        if (list.value?.items && list.value.items.length > 0) {
            return;
        }
        if (catalogLoadInFlight) {
            return catalogLoadInFlight;
        }
        catalogLoadInFlight = (async () => {
            try {
                await fetch({
                    page: 1,
                    pageSize: ORDER_CATALOG_PRODUCT_PAGE_SIZE,
                    active: true,
                });
            } finally {
                catalogLoadInFlight = null;
            }
        })();
        return catalogLoadInFlight;
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
            prependPagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al crear el producto' });
    };

    const update = async (id: number, payload: UpdateProductDto, opts?: FetchOpts) => {
        return run(async () => {
            const res = await productApi.updateProduct(id, payload);
            current.value = res.data;
            replacePagedItem(list, res.data);
            return res.data;
        }, { ...opts, errorMessage: 'Error al actualizar el producto' });
    };

    const remove = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            await productApi.deleteProduct(id);
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
        list.value = null;
        clearError();
    };

    return {
        list,
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
