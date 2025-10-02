import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { productCategoryApi } from '@/services/MainAPI/productCategoryApi';
import type {
    ProductCategory,
    ProductCategoryFilters,
    CreateProductCategoryDto,
    UpdateProductCategoryDto
} from '@/types/product';
import type { PagedResult } from '@/types/common';

export const useProductCategoriesStore = defineStore('productCategories', () => {
    const list = ref<PagedResult<ProductCategory> | null>(null);
    const current = ref<ProductCategory | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const currentCategories = computed(() => list.value?.items || []);
    const totalCategories = computed(() => list.value?.totalCount || 0);

    // Fetch categories with filters
    const fetch = async (filters?: ProductCategoryFilters) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productCategoryApi.getProductCategories(filters);
            list.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar categorías';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Fetch category by ID
    const fetchById = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productCategoryApi.getProductCategoryById(id);
            current.value = res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al cargar la categoría';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Create category
    const create = async (payload: CreateProductCategoryDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productCategoryApi.createProductCategory(payload);
            // Add to local list if it exists
            if (list.value) {
                list.value.items.unshift(res.data);
                list.value.totalCount += 1;
            }
            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al crear la categoría';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Update category
    const update = async (id: number, payload: UpdateProductCategoryDto) => {
        try {
            isLoading.value = true;
            error.value = null;
            const res = await productCategoryApi.updateProductCategory(id, payload);
            current.value = res.data;

            // Update in local list if it exists
            if (list.value) {
                const index = list.value.items.findIndex(category => category.id === id);
                if (index !== -1) {
                    list.value.items[index] = res.data;
                }
            }

            return res.data;
        } catch (err: any) {
            error.value = err.message || 'Error al actualizar la categoría';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Delete category
    const remove = async (id: number) => {
        try {
            isLoading.value = true;
            error.value = null;
            await productCategoryApi.deleteProductCategory(id);

            // Remove from local list if it exists
            if (list.value) {
                list.value.items = list.value.items.filter(category => category.id !== id);
                list.value.totalCount -= 1;
            }

            // Clear current if it's the deleted category
            if (current.value && current.value.id === id) {
                current.value = null;
            }
        } catch (err: any) {
            error.value = err.message || 'Error al eliminar la categoría';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // Clear state
    const clear = () => {
        current.value = null;
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
        isLoading,
        error,

        // Computed
        currentCategories,
        totalCategories,

        // Actions
        fetch,
        fetchById,
        create,
        update,
        remove,
        clear,
        clearList
    };
});

