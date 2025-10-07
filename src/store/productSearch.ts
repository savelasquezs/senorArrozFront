// src/store/productSearch.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, ProductCategory } from '@/types/product'

interface SearchState {
    query: string
    showSuggestions: boolean
    history: string[]
}

interface FilterState {
    category: number | null
    minPrice: number | null
    maxPrice: number | null
    stockFilter: string | null
    expanded: boolean
}

interface ProductSearchState {
    searchState: SearchState
    filterState: FilterState
}

export const useProductSearchStore = defineStore('productSearch', () => {
    // State
    const state = ref<ProductSearchState>({
        searchState: {
            query: '',
            showSuggestions: false,
            history: []
        },
        filterState: {
            category: null,
            minPrice: null,
            maxPrice: null,
            stockFilter: null,
            expanded: false
        }
    })

    // Getters
    const searchQuery = computed(() => state.value.searchState.query)
    const showSuggestions = computed(() => state.value.searchState.showSuggestions)
    const searchHistory = computed(() => state.value.searchState.history)

    const selectedCategory = computed(() => state.value.filterState.category)
    const minPrice = computed(() => state.value.filterState.minPrice)
    const maxPrice = computed(() => state.value.filterState.maxPrice)
    const selectedStockFilter = computed(() => state.value.filterState.stockFilter)
    const filtersExpanded = computed(() => state.value.filterState.expanded)

    // Actions
    const setSearchQuery = (query: string) => {
        state.value.searchState.query = query
    }

    const setShowSuggestions = (show: boolean) => {
        state.value.searchState.showSuggestions = show
    }

    const setCategoryFilter = (categoryId: number | null) => {
        state.value.filterState.category = categoryId
    }

    const setPriceFilter = (min: number | null, max: number | null) => {
        state.value.filterState.minPrice = min
        state.value.filterState.maxPrice = max
    }

    const setStockFilter = (stockFilter: string | null) => {
        state.value.filterState.stockFilter = stockFilter
    }

    const toggleFilters = () => {
        state.value.filterState.expanded = !state.value.filterState.expanded
    }

    const clearFilters = () => {
        state.value.filterState = {
            category: null,
            minPrice: null,
            maxPrice: null,
            stockFilter: null,
            expanded: false
        }
    }

    const clearSearch = () => {
        state.value.searchState.query = ''
        state.value.searchState.showSuggestions = false
    }

    const addToHistory = (query: string) => {
        if (!query.trim()) return

        const history = state.value.searchState.history
        const filtered = history.filter(item => item !== query)
        const newHistory = [query, ...filtered].slice(0, 10) // Keep last 10

        state.value.searchState.history = newHistory
        localStorage.setItem('product-search-history', JSON.stringify(newHistory))
    }

    const loadSearchHistory = () => {
        try {
            const stored = localStorage.getItem('product-search-history')
            if (stored) {
                state.value.searchState.history = JSON.parse(stored)
            }
        } catch (error) {
            console.error('Error loading search history:', error)
        }
    }

    const clearSearchHistory = () => {
        state.value.searchState.history = []
        localStorage.removeItem('product-search-history')
    }

    const searchWithDebounce = (callback: (query: string) => void, delay: number = 300) => {
        // Esta función debería ser implementada con debounce real
        // Por ahora, llamamos directamente al callback
        if (state.value.searchState.query.trim()) {
            addToHistory(state.value.searchState.query)
            callback(state.value.searchState.query)
        }
    }

    const buildFilters = (products: Product[], categories: ProductCategory[]) => {
        // Esta función podría contener lógica para filtrar productos
        // Por ahora, retornamos los filtros actuales
        return {
            query: state.value.searchState.query,
            category: state.value.filterState.category,
            minPrice: state.value.filterState.minPrice,
            maxPrice: state.value.filterState.maxPrice,
            stockFilter: state.value.filterState.stockFilter
        }
    }

    // Stock filter options
    const stockFilterOptions = computed(() => [
        { value: null, label: 'Todos los estados' },
        { value: 'available', label: 'Disponible' },
        { value: 'low', label: 'Stock bajo' },
        { value: 'out', label: 'Sin stock' }
    ])

    // Active filters for display
    const activeFilters = computed(() => {
        const filters = []

        if (state.value.filterState.category) {
            filters.push({
                type: 'category',
                label: `Categoría: ${state.value.filterState.category}`,
                value: state.value.filterState.category
            })
        }

        if (state.value.filterState.minPrice !== null) {
            filters.push({
                type: 'minPrice',
                label: `Precio min: $${state.value.filterState.minPrice.toLocaleString()}`,
                value: state.value.filterState.minPrice
            })
        }

        if (state.value.filterState.maxPrice !== null) {
            filters.push({
                type: 'maxPrice',
                label: `Precio max: $${state.value.filterState.maxPrice.toLocaleString()}`,
                value: state.value.filterState.maxPrice
            })
        }

        if (state.value.filterState.stockFilter) {
            const option = stockFilterOptions.value.find(opt => opt.value === state.value.filterState.stockFilter)
            if (option) {
                filters.push({
                    type: 'stockFilter',
                    label: `Stock: ${option.label}`,
                    value: state.value.filterState.stockFilter
                })
            }
        }

        return filters
    })

    return {
        // State
        searchState: state.value.searchState,
        filterState: state.value.filterState,

        // Getters
        searchQuery,
        showSuggestions,
        searchHistory,
        selectedCategory,
        minPrice,
        maxPrice,
        selectedStockFilter,
        filtersExpanded,
        stockFilterOptions,
        activeFilters,

        // Actions
        setSearchQuery,
        setShowSuggestions,
        setCategoryFilter,
        setPriceFilter,
        setStockFilter,
        toggleFilters,
        clearFilters,
        clearSearch,
        addToHistory,
        loadSearchHistory,
        clearSearchHistory,
        searchWithDebounce,
        buildFilters
    }
})
