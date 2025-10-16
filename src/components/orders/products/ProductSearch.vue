<template>
    <div class="product-search space-y-4">
        <!-- Search Input -->
        <SearchInput v-model="searchQuery" :placeholder="placeholder" :suggestions="suggestions"
            :show-suggestions="showSuggestions" @focus="handleSearchFocus" @blur="handleSearchBlur"
            @clear="handleSearchClear" @suggestion-selected="handleSuggestionSelected" />

        <!-- Active Filters -->
        <ActiveFilters v-if="showFilters" :active-filters="searchStore.activeFilters"
            @remove-filter="handleRemoveFilter" @clear-all="handleClearAllFilters" />

        <!-- Filter Toggle Button -->
        <div v-if="showFilters" class="flex justify-between items-center">
            <FilterToggle :expanded="searchStore.filtersExpanded" @toggle="toggleFilters" />
        </div>

        <!-- Filter Panel -->
        <div v-if="showFilters && searchStore.filtersExpanded" class="p-4 bg-gray-50 rounded-lg border">
            <FilterPanel :selected-category="searchStore.selectedCategory" :min-price="searchStore.minPrice"
                :max-price="searchStore.maxPrice" :selected-stock-filter="searchStore.selectedStockFilter"
                :categories="categories" :stock-filter-options="searchStore.stockFilterOptions"
                @category-change="handleCategoryFilter" @min-price-change="handleMinPriceChange"
                @max-price-change="handleMaxPriceChange" @stock-filter-change="handleStockFilterChange" />
        </div>

        <!-- Search History -->
        <SearchHistory v-if="showSearchHistory && searchStore.searchHistory.length > 0"
            :search-history="searchStore.searchHistory" @history-click="handleHistoryClick"
            @clear-history="clearSearchHistory" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { Product, ProductCategory, ProductFilters } from '@/types/product'

// Store
import { useProductSearchStore } from '@/store/productSearch'

// Components
import SearchInput from './ProductSearch/SearchInput.vue'
import FilterToggle from './ProductSearch/FilterToggle.vue'
import ActiveFilters from './ProductSearch/ActiveFilters.vue'
import FilterPanel from './ProductSearch/FilterPanel.vue'
import SearchHistory from './ProductSearch/SearchHistory.vue'

// Props
interface Props {
    placeholder?: string
    showFilters?: boolean
    showSearchHistory?: boolean
    debounceMs?: number
    products: Product[]
    categories: ProductCategory[]
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: 'Buscar productos...',
    showFilters: true,
    showSearchHistory: true,
    debounceMs: 300
})

// Emits
const emit = defineEmits<{
    'search': [query: string]
    'filter': [filters: ProductFilters]
    'suggestion-selected': [product: Product]
}>()

// Store
const searchStore = useProductSearchStore()

// Computed from store
const searchQuery = computed(() => searchStore.searchState.query)
const showSuggestions = computed(() => searchStore.searchState.showSuggestions)

// Computed for suggestions
const suggestions = computed(() => {
    if (!searchQuery.value || searchQuery.value.length < 2) return []

    const query = searchQuery.value.toLowerCase()
    return props.products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        (product.categoryName && product.categoryName.toLowerCase().includes(query))
    ).slice(0, 5) // Limit to 5 suggestions
})

// Methods
const handleSearch = (query: string) => {
    searchStore.setSearchQuery(query)
    searchStore.searchWithDebounce((searchQuery: string) => {
        emit('search', searchQuery)
    }, props.debounceMs)
}

const handleSearchFocus = () => {
    searchStore.setShowSuggestions(true)
}

const handleSearchBlur = () => {
    // Delay hiding suggestions to allow clicks on suggestions
    setTimeout(() => {
        searchStore.setShowSuggestions(false)
    }, 200)
}

const handleSearchClear = () => {
    searchStore.clearSearch()
    emit('search', '')
}

const handleSuggestionSelected = (product: Product) => {
    searchStore.setShowSuggestions(false)
    emit('suggestion-selected', product)
}

const handleCategoryFilter = (categoryId: number | null) => {
    searchStore.setCategoryFilter(categoryId)
    emitFilters()
}

const handleMinPriceChange = (price: number | null) => {
    searchStore.setPriceFilter(price, searchStore.maxPrice)
    emitFilters()
}

const handleMaxPriceChange = (price: number | null) => {
    searchStore.setPriceFilter(searchStore.minPrice, price)
    emitFilters()
}

const handleStockFilterChange = (stockFilter: string | null) => {
    searchStore.setStockFilter(stockFilter)
    emitFilters()
}

const handleRemoveFilter = (filter: any) => {
    switch (filter.type) {
        case 'category':
            searchStore.setCategoryFilter(null)
            break
        case 'minPrice':
            searchStore.setPriceFilter(null, searchStore.maxPrice)
            break
        case 'maxPrice':
            searchStore.setPriceFilter(searchStore.minPrice, null)
            break
        case 'stockFilter':
            searchStore.setStockFilter(null)
            break
    }
    emitFilters()
}

const handleClearAllFilters = () => {
    searchStore.clearFilters()
    emitFilters()
}

const handleHistoryClick = (term: string) => {
    searchStore.setSearchQuery(term)
    emit('search', term)
}

const toggleFilters = () => {
    searchStore.toggleFilters()
}

const clearSearchHistory = () => {
    searchStore.clearSearchHistory()
}

const emitFilters = () => {
    const filters: ProductFilters = {
        name: searchStore.searchState.query || undefined,
        categoryId: searchStore.selectedCategory || undefined,
        minPrice: searchStore.minPrice || undefined,
        maxPrice: searchStore.maxPrice || undefined,
        active: true, // Default to active products
        page: 1,
        pageSize: 1000
    }
    emit('filter', filters)
}

// Watch for search query changes
watch(searchQuery, (newQuery: string) => {
    if (newQuery !== undefined) {
        handleSearch(newQuery)
    }
})

// Lifecycle
onMounted(() => {
    searchStore.loadSearchHistory()
})
</script>

<style scoped>
.product-search {
    width: 100%;
}
</style>
