<template>
    <div class="product-categories" :class="containerClasses">
        <!-- Search Bar (when enabled) -->
        <div v-if="showSearch" class="mb-4">
            <BaseInput :model-value="categoriesStore.searchQuery" @update:model-value="handleSearchInput"
                placeholder="Buscar categorías..." :icon="MagnifyingGlassIcon" class="w-full" />
        </div>

        <!-- Categories Container -->
        <div :class="layoutClasses">
            <!-- All Products Button -->
            <div v-if="showAllOption" :class="categoryItemClasses" :style="{ animationDelay: '0ms' }">
                <BaseButton @click="handleCategorySelect(null)" :variant="isAllSelected ? 'primary' : 'outline'"
                    :size="buttonSize" :class="categoryButtonClasses">
                    <span class="flex items-center">
                        <SparklesIcon class="w-4 h-4 mr-2" />
                        <span>Todos</span>
                        <span v-if="showCounts && allProductsCount > 0" class="ml-2 text-xs opacity-75">
                            ({{ allProductsCount }})
                        </span>
                    </span>
                </BaseButton>
            </div>

            <!-- Category Items -->
            <TransitionGroup name="category-fade" tag="div" :class="categoriesGridClasses">
                <div v-for="(category, index) in filteredCategories" :key="category.id" :class="categoryItemClasses"
                    :style="{ animationDelay: `${index * 50}ms` }">
                    <BaseButton @click="handleCategorySelect(category.id)"
                        :variant="isCategorySelected(category.id) ? 'primary' : 'outline'" :size="buttonSize"
                        :class="categoryButtonClasses">
                        <span class="flex items-center">
                            <TagIcon class="w-4 h-4 mr-2" />
                            <span>{{ category.name }}</span>
                            <span v-if="showCounts && category.activeProducts > 0" class="ml-2 text-xs opacity-75">
                                ({{ category.activeProducts }})
                            </span>
                            <!-- Favorite Star -->
                            <button v-if="showFavorites" @click.stop="toggleFavorite(category.id)"
                                class="ml-2 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors">
                                <StarIcon
                                    :class="isFavorite(category.id) ? 'text-yellow-400 fill-current' : 'text-gray-400'"
                                    class="w-3 h-3" />
                            </button>
                        </span>
                    </BaseButton>
                </div>
            </TransitionGroup>
        </div>

        <!-- Selected Category Info (enhanced) -->
        <Transition name="slide-down">
            <div v-if="selectedCategoryInfo" class="mt-4">
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <TagIcon class="w-4 h-4 text-blue-600" />
                                </div>
                            </div>
                            <div class="ml-3">
                                <h3 class="text-sm font-medium text-blue-900">
                                    {{ selectedCategoryInfo.name }}
                                </h3>
                                <p class="text-xs text-blue-700">
                                    {{ selectedCategoryInfo.activeProducts }} productos activos
                                    <span
                                        v-if="selectedCategoryInfo.totalProducts !== selectedCategoryInfo.activeProducts">
                                        • {{ selectedCategoryInfo.totalProducts }} total
                                    </span>
                                </p>
                            </div>
                        </div>
                        <BaseButton @click="clearSelection" variant="outline" size="sm">
                            <span class="flex items-center">
                                <XMarkIcon class="w-3 h-3 mr-1" />
                                Limpiar
                            </span>
                        </BaseButton>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Loading State -->
        <div v-if="loading" class="mt-4">
            <div class="flex flex-wrap gap-2">
                <div v-for="i in 4" :key="i" class="animate-pulse">
                    <div class="h-8 bg-gray-200 rounded-lg w-24"></div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && filteredCategories.length === 0" class="mt-4 text-center py-8">
            <div class="text-gray-400 mb-2">
                <TagIcon class="w-8 h-8 mx-auto" />
            </div>
            <p class="text-sm text-gray-500">
                {{ categoriesStore.searchQuery ? 'No se encontraron categorías' : 'No hay categorías disponibles' }}
            </p>
            <BaseButton v-if="categoriesStore.searchQuery" @click="categoriesStore.clearSearch" variant="ghost"
                size="sm" class="mt-2">
                Limpiar búsqueda
            </BaseButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useOrdersStore } from '@/store/orders'
import { useProductCategoriesStore } from '@/store/productCategories'
import type { ProductCategory } from '@/types/product'

// Components
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

// Icons
import {
    TagIcon,
    SparklesIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    StarIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
    categories?: ProductCategory[]
    selectedCategory?: number | null
    layout?: 'horizontal' | 'vertical' | 'grid'
    showCounts?: boolean
    showSearch?: boolean
    showFavorites?: boolean
    showAllOption?: boolean
    compact?: boolean
    loading?: boolean
    multiSelect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    categories: () => [],
    selectedCategory: null,
    layout: 'horizontal',
    showCounts: true,
    showSearch: false,
    showFavorites: false,
    showAllOption: true,
    compact: false,
    loading: false,
    multiSelect: false
})

// Emits
const emit = defineEmits<{
    categorySelected: [categoryId: number | null]
    categoriesSelected: [categoryIds: number[]] // For multi-select
    search: [query: string]
}>()

// Composables
const ordersStore = useOrdersStore()
const categoriesStore = useProductCategoriesStore()

// Computed
const categories = computed(() =>
    props.categories.length > 0 ? props.categories : ordersStore.categories
)

const filteredCategories = computed(() => {
    return categoriesStore.filteredCategories(categories.value)
})

const selectedCategory = computed(() =>
    props.selectedCategory ?? ordersStore.selectedCategory
)

const isAllSelected = computed(() => selectedCategory.value === null)

const allProductsCount = computed(() => ordersStore.products.length)

const selectedCategoryInfo = computed(() => {
    if (!selectedCategory.value) return null

    const category = categories.value.find(c => c.id === selectedCategory.value)
    return category || null
})

// Layout classes
const containerClasses = computed(() => ({
    'product-categories': true,
    'compact': props.compact
}))

const layoutClasses = computed(() => {
    switch (props.layout) {
        case 'vertical':
            return 'flex flex-col gap-2'
        case 'grid':
            return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2'
        default: // horizontal
            return 'flex flex-wrap gap-2 py-2 overflow-x-auto'
    }
})

const categoriesGridClasses = computed(() => {
    if (props.layout === 'horizontal') {
        return 'flex flex-wrap gap-2'
    }
    return ''
})

const categoryItemClasses = computed(() => {
    const base = 'category-item'

    if (props.layout === 'grid') {
        return `${base} flex justify-center`
    }

    return base
})

const categoryButtonClasses = computed(() => {
    const base = 'whitespace-nowrap transition-all duration-200'

    if (props.layout === 'horizontal') {
        return `${base} flex items-center`
    }

    return base
})

const buttonSize = computed(() => props.compact ? 'sm' : 'md')

// Methods
const handleCategorySelect = (categoryId: number | null) => {
    if (props.multiSelect) {
        if (categoryId !== null) {
            categoriesStore.toggleCategorySelection(categoryId)
            emit('categoriesSelected', categoriesStore.selectedCategoriesList)
        } else {
            categoriesStore.clearSelection()
            emit('categoriesSelected', [])
        }
    } else {
        ordersStore.setSelectedCategory(categoryId)
        emit('categorySelected', categoryId)
    }
}

const isCategorySelected = (categoryId: number) => {
    if (props.multiSelect) {
        return categoriesStore.isSelected(categoryId)
    }
    return selectedCategory.value === categoryId
}

const clearSelection = () => {
    handleCategorySelect(null)
}

const toggleFavorite = (categoryId: number) => {
    categoriesStore.toggleFavorite(categoryId)
}

const isFavorite = (categoryId: number) => {
    return categoriesStore.isFavorite(categoryId)
}

const handleSearchInput = (value: string | number | null) => {
    const stringValue = String(value || '')
    categoriesStore.setSearchQuery(stringValue)
    emit('search', stringValue)
}

// Lifecycle
onMounted(() => {
    // Initialize the categories store
    categoriesStore.initializeStore()
})
</script>

<style scoped>
.product-categories {
    @apply w-full;
}

.product-categories.compact {
    @apply text-sm;
}

/* Scrollbar styling for horizontal layout */
.product-categories .overflow-x-auto {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

.product-categories .overflow-x-auto::-webkit-scrollbar {
    height: 4px;
}

.product-categories .overflow-x-auto::-webkit-scrollbar-track {
    background: transparent;
}

.product-categories .overflow-x-auto::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 2px;
}

.product-categories .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
}

/* Animation classes */
.category-fade-enter-active,
.category-fade-leave-active {
    transition: all 0.3s ease;
}

.category-fade-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

.category-fade-leave-to {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
}

.category-fade-move {
    transition: transform 0.3s ease;
}

.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.3s ease;
}

.slide-down-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.slide-down-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Hover effects for category buttons */
.category-item .btn-primary:hover,
.category-item .btn-outline:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .product-categories .flex-wrap {
        gap: 0.5rem;
    }

    .product-categories .category-item {
        flex-shrink: 0;
    }
}

/* Grid layout responsive adjustments */
@media (max-width: 640px) {
    .product-categories .grid-cols-2 {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 641px) and (max-width: 768px) {
    .product-categories .sm\:grid-cols-3 {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (min-width: 769px) and (max-width: 1024px) {
    .product-categories .md\:grid-cols-4 {
        grid-template-columns: repeat(4, 1fr);
    }
}

@media (min-width: 1025px) {
    .product-categories .lg\:grid-cols-5 {
        grid-template-columns: repeat(5, 1fr);
    }
}
</style>
