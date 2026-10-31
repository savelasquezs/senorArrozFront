<template>
    <div class="product-grid-container">
        <!-- Loading State with Skeleton -->
        <div v-if="loading" class="grid gap-4" :class="gridClasses" :style="gridStyle">
            <ProductCardSkeleton v-for="n in skeletonCount" :key="`skeleton-${n}`" :variant="cardVariant" />
        </div>


        <!-- Empty State -->
        <div v-else-if="products.length === 0" class="empty-state">
            <div class="text-center py-12">
                <ShoppingBagIcon class="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                    {{ emptyMessage || 'No hay productos' }}
                </h3>
                <p class="text-gray-500">
                    {{ emptyDescription || 'No se encontraron productos para mostrar.' }}
                </p>
            </div>
        </div>

        <!-- Products Grid -->
        <div v-else>
            <template v-if="isFirstWordGroupTab && firstWordGroupEntries.length > 0">
                <template v-if="selectedGroupKey === null">
                    <div class="products-grid" :class="gridClasses" :style="gridStyle">
                        <button
                            v-for="row in firstWordGroupEntries"
                            :key="row.key"
                            type="button"
                            class="first-word-group-btn"
                            @click="selectedGroupKey = row.key"
                        >
                            <span class="first-word-group-label">{{ row.label }}</span>
                            <span class="first-word-group-count">{{ row.count }}</span>
                        </button>
                    </div>
                </template>
                <template v-else>
                    <div class="first-word-group-back">
                        <button type="button" class="first-word-back-btn" @click="selectedGroupKey = null">
                            <ArrowLeftIcon class="w-4 h-4" />
                            Volver
                        </button>
                    </div>
                    <div class="products-grid" :class="gridClasses" :style="gridStyle">
                        <ProductCard
                            v-for="product in productsInSelectedGroup"
                            :key="product.id"
                            :product="product"
                            :variant="cardVariant"
                            :is-selected="isProductSelected(product)" :selection-only="selectionOnly"
                            :disabled="disabled || isProductDisabled(product)"
                            :disabled-reason="isProductDisabled(product) ? 'Ya en el pedido' : undefined"
                            @product-click="handleProductClick"
                            @product-add="handleProductAdd"
                        />
                    </div>
                </template>
            </template>

            <template v-else-if="isSpecialCategory">
                <div v-if="productsWithoutChich.length > 0" class="products-grid" :class="gridClasses" :style="gridStyle">
                    <ProductCard v-for="product in productsWithoutChich" :key="product.id" :product="product"
                        :variant="cardVariant" :is-selected="isProductSelected(product)" :selection-only="selectionOnly"
                            :disabled="disabled || isProductDisabled(product)"
                            :disabled-reason="isProductDisabled(product) ? 'Ya en el pedido' : undefined"
                        @product-click="handleProductClick" @product-add="handleProductAdd" />
                </div>

                <div v-if="productsWithChich.length > 0" class="chich-section">
                    <div class="chich-divider">
                        <span class="chich-title">Con chicharrón</span>
                        <span class="chich-count">{{ productsWithChich.length }}</span>
                    </div>
                    <div class="products-grid" :class="gridClasses" :style="gridStyle">
                        <ProductCard v-for="product in productsWithChich" :key="product.id" :product="product"
                            :variant="cardVariant" :is-selected="isProductSelected(product)" :selection-only="selectionOnly"
                            :disabled="disabled || isProductDisabled(product)"
                            :disabled-reason="isProductDisabled(product) ? 'Ya en el pedido' : undefined"
                            @product-click="handleProductClick" @product-add="handleProductAdd" />
                    </div>
                </div>
            </template>

            <div v-else class="products-grid" :class="gridClasses" :style="gridStyle">
                <ProductCard v-for="product in products" :key="product.id" :product="product"
                    :variant="cardVariant" :is-selected="isProductSelected(product)" :selection-only="selectionOnly"
                            :disabled="disabled || isProductDisabled(product)"
                            :disabled-reason="isProductDisabled(product) ? 'Ya en el pedido' : undefined"
                    @product-click="handleProductClick" @product-add="handleProductAdd" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useOrdersDraftsStore } from '@/store/ordersDrafts'
import { useProductCategoriesStore } from '@/store/productCategories'
import {
    selectedTabIsPaisaOrRopaVieja,
    selectedTabIsFirstWordGroupCategory,
    firstWordGroupKeyFromProductName,
    sortProductsByPortionOrder,
} from '@/config/orderPosCategories'
import type { Product } from '@/types/order'

// Components
import ProductCard from '@/components/orders/products/ProductCard.vue'
import ProductCardSkeleton from '@/components/orders/products/ProductCardSkeleton.vue'

// Icons
import { ShoppingBagIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

// Props
interface Props {
    products?: Product[]
    loading?: boolean
    columns?: number
    gap?: 'sm' | 'md' | 'lg'
    showCategories?: boolean
    emptyMessage?: string
    emptyDescription?: string
    cardVariant?: 'default' | 'compact'
    showStock?: boolean
    selectedProducts?: Product[]
    categories?: { id: number; name: string }[]
    selectedCategoryIds?: number[] | null
    selectionOnly?: boolean
    disabled?: boolean
    fitContainer?: boolean
    disabledProductIds?: number[]
    skeletonCount?: number
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
    columns: 0, // 0 = auto responsive
    gap: 'md',
    showCategories: true,
    emptyMessage: '',
    emptyDescription: '',
    cardVariant: 'default',
    showStock: true,
    selectedProducts: () => [],
    disabledProductIds: () => [],
    skeletonCount: 8
})

// Emits
const emit = defineEmits<{
    'product-click': [product: Product]
    'product-add': [product: Product]
    'products-loaded': [products: Product[]]
}>()

// Composables
const ordersStore = useOrdersDraftsStore()
const productCategoriesStore = useProductCategoriesStore()

// Computed
const products = computed(() => {
    return props.products ?? ordersStore.filteredProducts
})

const posCatalog = computed(() =>
    props.categories ?? (productCategoriesStore.catalogCategories ?? productCategoriesStore.list?.items)?.map(c => ({ id: c.id, name: c.name ?? '' })) ?? [],
)

const selectedCategoryIds = computed(() => props.selectedCategoryIds === undefined ? ordersStore.selectedCategoryIds : props.selectedCategoryIds)

const selectedGroupKey = ref<string | null>(null)

const isFirstWordGroupTab = computed(() =>
    selectedTabIsFirstWordGroupCategory(posCatalog.value, selectedCategoryIds.value),
)

function formatFirstWordGroupLabel(key: string): string {
    if (!key) return key
    return key.charAt(0).toUpperCase() + key.slice(1)
}

// Share one grouping pass between the group buttons and the selected group's cards.
const firstWordGroups = computed(() => {
    const groups = new Map<string, Product[]>()
    if (!isFirstWordGroupTab.value) return groups
    for (const product of products.value) {
        const key = firstWordGroupKeyFromProductName(product.name)
        const group = groups.get(key)
        if (group) group.push(product)
        else groups.set(key, [product])
    }
    return groups
})

const firstWordGroupEntries = computed(() =>
    [...firstWordGroups.value].map(([key, group]) => ({
        key, label: formatFirstWordGroupLabel(key), count: group.length,
    })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
)

const productsInSelectedGroup = computed(() => selectedGroupKey.value === null
    ? []
    : sortProductsByPortionOrder(firstWordGroups.value.get(selectedGroupKey.value) ?? []))

const chichRegex = /chich/i

// Partition once, preserving the existing order within each section.
const chichGroups = computed(() => {
    const withChich: Product[] = [], withoutChich: Product[] = []
    if (selectedTabIsPaisaOrRopaVieja(posCatalog.value, selectedCategoryIds.value)) {
        for (const product of products.value) {
            (chichRegex.test(product.name) ? withChich : withoutChich).push(product)
        }
    }
    return { withChich, withoutChich }
})
const isSpecialCategory = computed(() => chichGroups.value.withChich.length > 0)
const productsWithoutChich = computed(() => chichGroups.value.withoutChich)
const productsWithChich = computed(() => chichGroups.value.withChich)

const gridStyle = computed(() => props.fitContainer ? { gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))' } : undefined)

const gridClasses = computed(() => {
    const classes = []

    // Gap classes
    switch (props.gap) {
        case 'sm':
            classes.push('gap-2')
            break
        case 'lg':
            classes.push('gap-6')
            break
        default:
            classes.push('gap-4')
    }

    // Column classes
    if (props.columns > 0) {
        // Fixed columns
        classes.push(`grid-cols-${props.columns}`)
    } else {
        // Responsive columns
        classes.push('grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6')
    }

    classes.push('grid')
    return classes.join(' ')
})

const skeletonCount = computed(() => {
    if (props.columns > 0) {
        return Math.min(props.skeletonCount, props.columns * 2)
    }
    return props.skeletonCount
})

// Methods
// Rebuild membership only when the selection changes, rather than scanning
// selected/disabled arrays for every card in every catalog render.
const selectedProductIds = computed(() => new Set(props.selectedProducts.map(product => product.id)))
const disabledIdSet = computed(() => new Set(props.disabledProductIds))
const isProductSelected = (product: Product) => selectedProductIds.value.has(product.id)
const isProductDisabled = (product: Product) => disabledIdSet.value.has(product.id)

const handleProductClick = (product: Product) => {
    emit('product-click', product)
}

const handleProductAdd = (product: Product) => {
    emit('product-add', product)
}

// Watchers
watch(products, (newProducts) => {
    if (newProducts.length > 0) {
        emit('products-loaded', newProducts)
    }
}, { immediate: true })

// Replacing arrays or refreshing stock must not send the operator back to group selection.
watch(() => [...(selectedCategoryIds.value ?? [])].sort((a, b) => a - b).join(','), () => {
    selectedGroupKey.value = null
})
watch([firstWordGroups, isFirstWordGroupTab, () => props.loading], ([groups, grouped, loading]) => {
    if (!grouped || (!loading && selectedGroupKey.value !== null && !groups.has(selectedGroupKey.value))) {
        selectedGroupKey.value = null
    }
})
</script>

<style scoped>
.product-grid-container {
    width: 100%;
}

.empty-state {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.products-grid {
    width: 100%;
}

.chich-section {
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.chich-divider {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border: 1px dashed #d1d5db;
    border-radius: 0.75rem;
    background-color: #f9fafb;
}

.chich-title {
    font-weight: 600;
    color: #065f46;
}

.chich-count {
    font-size: 0.875rem;
    color: #065f46;
    font-weight: 500;
}

.first-word-group-back {
    margin-bottom: 0.75rem;
}

.first-word-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #047857;
}

.first-word-back-btn:hover {
    color: #065f46;
}

.first-word-group-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.25rem;
    min-height: 4.5rem;
    padding: 0.75rem 1rem;
    text-align: left;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
}

.first-word-group-btn:hover {
    border-color: #10b981;
    box-shadow: 0 2px 6px rgb(16 185 129 / 0.15);
    background: #f0fdf4;
}

.first-word-group-label {
    font-weight: 600;
    color: #111827;
    font-size: 0.9375rem;
}

.first-word-group-count {
    font-size: 0.8125rem;
    color: #6b7280;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .products-grid {
        grid-template-columns: repeat(1, minmax(0, 1fr));
    }
}

@media (min-width: 641px) and (max-width: 768px) {
    .products-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .products-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (min-width: 1025px) and (max-width: 1280px) {
    .products-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (min-width: 1281px) and (max-width: 1536px) {
    .products-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
    }
}

@media (min-width: 1537px) {
    .products-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
    }
}
</style>
