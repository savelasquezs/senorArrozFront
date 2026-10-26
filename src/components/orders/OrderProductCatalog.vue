<template>
    <div class="flex h-full min-h-0 flex-col overflow-hidden" data-test="order-product-catalog">
        <div class="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50 px-4 pb-2 pt-3">
            <BaseInput v-model="query" aria-label="Buscar productos" placeholder="Buscar producto o presentación…" size="sm">
                <template #icon><MagnifyingGlassIcon class="h-4 w-4" /></template>
            </BaseInput>
            <CategoriesBar v-model:selected-category-ids="selectedIds" :rice-tabs="tabs.rice" :other-tabs="tabs.other"
                @update:selected-category-ids="query = ''" />
            <p class="text-xs text-gray-500" aria-live="polite">{{ filteredProducts.length }} productos</p>
            <div v-if="error" role="alert" class="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
                {{ error }} <button type="button" class="ml-2 font-medium underline" @click="$emit('retry')">Reintentar</button>
            </div>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" data-test="catalog-products-scroll">
            <ProductGrid :products="filteredProducts" :categories="catalogCategories"
                :selected-category-ids="query.trim() ? null : selectedIds" :loading="loading && !products.length"
                :selection-only="selectionOnly" :selected-products="selectedProducts" :disabled="disabled || loading"
                :disabled-product-ids="disabledProductIds" :fit-container="compact" :card-variant="compact ? 'compact' : 'default'"
                :gap="compact ? 'sm' : 'md'" @product-add="$emit('product-selected', $event)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import CategoriesBar from '@/components/products/CategoriesBar.vue'
import ProductGrid from './products/ProductGrid.vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { buildOrderPosTabs } from '@/config/orderPosCategories'
import { filterOrderCatalog, orderCatalogCategories } from '@/helpers/orderProductCatalog'
import type { Product } from '@/types/product'

const props = withDefaults(defineProps<{
    products: Product[]
    categories?: { id: number; name: string }[]
    loading?: boolean
    error?: string | null
    disabled?: boolean
    selectionOnly?: boolean
    compact?: boolean
    selectedProducts?: Product[]
    disabledProductIds?: number[]
}>(), { categories: () => [], selectedProducts: () => [], disabledProductIds: () => [] })
defineEmits<{ 'product-selected': [product: Product]; retry: [] }>()
const query = defineModel<string>('searchQuery', { default: '' })
const selectedIds = defineModel<number[] | null>('selectedCategoryIds', { default: null })
const catalogCategories = computed(() => orderCatalogCategories(props.products, props.categories))
const tabs = computed(() => buildOrderPosTabs(catalogCategories.value))
const filteredProducts = computed(() => filterOrderCatalog(props.products, catalogCategories.value, query.value, selectedIds.value))
watch(query, value => { if (value.trim()) selectedIds.value = null })
</script>
