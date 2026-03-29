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

/** Catálogo para pedidos: activos, transversal a sucursales (no enviar branchId). */
export const ORDER_CATALOG_PRODUCT_PAGE_SIZE = 150;

let catalogLoadInFlight: Promise<void> | null = null;

export const useProductsStore = defineStore('products', () => {
    const list = ref<PagedResult<Product> | null>(null);
    const current = ref<Product | null>(null);
    const currentDetail = ref<ProductDetail | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const currentProducts = computed(() => list.value?.items || []);
    const totalProducts = computed(() => list.value?.totalCount || 0);

    // Fetch products with filters
    const fetch = async (filters?: ProductFilters) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productApi.getProducts(filters);
            list.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar productos';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    /** Catálogo para toma de pedidos: una sola carga por sesión salvo `clearList` / mutación explícita. */
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

    // Fetch product by ID
    const fetchById = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productApi.getProductById(id);
            current.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar el producto';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch product detail with statistics
    const fetchDetail = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productApi.getProductDetail(id);
            currentDetail.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar los detalles del producto';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Create product
    const create = async (payload: CreateProductDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productApi.createProduct(payload);
            // Add to local list if it exists
            if (list.value) {
                list.value.items.unshift(res.data);
                list.value.totalCount += 1;
            }
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al crear el producto';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Update product
    const update = async (id: number, payload: UpdateProductDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productApi.updateProduct(id, payload);
            current.value = res.data;

            // Update in local list if it exists
            if (list.value) {
                const index = list.value.items.findIndex(product => product.id === id);
                if (index !== -1) {
                    list.value.items[index] = res.data;
                }
            }

            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al actualizar el producto';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Delete product
    const remove = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            await productApi.deleteProduct(id);

            // Remove from local list if it exists
            if (list.value) {
                list.value.items = list.value.items.filter(product => product.id !== id);
                list.value.totalCount -= 1;
            }

            // Clear current if it's the deleted product
            if (current.value && current.value.id === id) {
                current.value = null;
            }
        } catch (err: any) {
            error.value = err.message || 'Error al eliminar el producto';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Adjust stock
    const adjustStock = async (id: number, payload: StockAdjustmentDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productApi.adjustStock(id, payload);

            // Update stock in local list and current
            if (list.value) {
                const index = list.value.items.findIndex(product => product.id === id);
                if (index !== -1) {
                    const row = list.value.items[index];
                    row.stock = (row.stock ?? 0) + payload.quantity;
                }
            }

            if (current.value && current.value.id === id) {
                current.value.stock = (current.value.stock ?? 0) + payload.quantity;
            }

            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al ajustar el stock';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Clear state
    const clear = () => {
        current.value = null;
        currentDetail.value = null;
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
        currentDetail,
        isLoading,
        error,

        // Computed
        currentProducts,
        totalProducts,

        // Actions
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

