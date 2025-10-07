import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductSearchStore } from '../productSearch'

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
})

describe('productSearch Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    const createStore = () => {
        setActivePinia(createPinia())
        return useProductSearchStore()
    }

    describe('State', () => {
        it('initializes with correct default state', () => {
            const store = useProductSearchStore()

            expect(store.searchState.query).toBe('')
            expect(store.searchState.showSuggestions).toBe(false)
            expect(store.searchState.history).toEqual([])
            expect(store.filterState.category).toBe(null)
            expect(store.filterState.minPrice).toBe(null)
            expect(store.filterState.maxPrice).toBe(null)
            expect(store.filterState.stockFilter).toBe(null)
            expect(store.filterState.expanded).toBe(false)
        })
    })

    describe('Getters', () => {
        it('computes search query correctly', () => {
            const store = useProductSearchStore()
            store.setSearchQuery('test query')
            expect(store.searchQuery).toBe('test query')
        })

        it('computes show suggestions correctly', () => {
            const store = useProductSearchStore()
            store.setShowSuggestions(true)
            expect(store.showSuggestions).toBe(true)
        })

        it('computes active filters correctly', () => {
            const store = useProductSearchStore()
            store.setCategoryFilter(1)
            store.setPriceFilter(1000, 5000)
            store.setStockFilter('available')

            const activeFilters = store.activeFilters
            expect(activeFilters).toHaveLength(4) // minPrice, maxPrice, category, stockFilter
            expect(activeFilters.some(f => f.type === 'category' && f.value === 1)).toBe(true)
            expect(activeFilters.some(f => f.type === 'minPrice' && f.value === 1000)).toBe(true)
            expect(activeFilters.some(f => f.type === 'maxPrice' && f.value === 5000)).toBe(true)
            expect(activeFilters.some(f => f.type === 'stockFilter' && f.value === 'available')).toBe(true)
        })

        it('computes stock filter options correctly', () => {
            const store = useProductSearchStore()
            const options = store.stockFilterOptions

            expect(options).toHaveLength(4)
            expect(options[0]).toEqual({ value: null, label: 'Todos los estados' })
            expect(options[1]).toEqual({ value: 'available', label: 'Disponible' })
            expect(options[2]).toEqual({ value: 'low', label: 'Stock bajo' })
            expect(options[3]).toEqual({ value: 'out', label: 'Sin stock' })
        })
    })

    describe('Actions', () => {
        it('sets search query', () => {
            const store = useProductSearchStore()
            store.setSearchQuery('test')
            expect(store.searchState.query).toBe('test')
        })

        it('sets show suggestions', () => {
            const store = useProductSearchStore()
            store.setShowSuggestions(true)
            expect(store.searchState.showSuggestions).toBe(true)
        })

        it('sets category filter', () => {
            const store = useProductSearchStore()
            store.setCategoryFilter(5)
            expect(store.filterState.category).toBe(5)
        })

        it('sets price filter', () => {
            const store = useProductSearchStore()
            store.setPriceFilter(1000, 5000)
            expect(store.filterState.minPrice).toBe(1000)
            expect(store.filterState.maxPrice).toBe(5000)
        })

        it('sets stock filter', () => {
            const store = useProductSearchStore()
            store.setStockFilter('available')
            expect(store.filterState.stockFilter).toBe('available')
        })

        it('toggles filters', () => {
            const store = useProductSearchStore()
            expect(store.filterState.expanded).toBe(false)

            store.toggleFilters()
            expect(store.filterState.expanded).toBe(true)

            store.toggleFilters()
            expect(store.filterState.expanded).toBe(false)
        })

        it('clears filters', () => {
            const store = createStore()

            // Set some filters
            store.setCategoryFilter(1)
            store.setPriceFilter(1000, 5000)
            store.setStockFilter('available')

            // Verify they are set
            expect(store.selectedCategory).toBe(1)
            expect(store.minPrice).toBe(1000)
            expect(store.maxPrice).toBe(5000)
            expect(store.selectedStockFilter).toBe('available')

            // Clear filters
            store.clearFilters()

            // Verify they are cleared
            expect(store.selectedCategory).toBe(null)
            expect(store.minPrice).toBe(null)
            expect(store.maxPrice).toBe(null)
            expect(store.selectedStockFilter).toBe(null)
            expect(store.filtersExpanded).toBe(false)
        })

        it('clears search', () => {
            const store = useProductSearchStore()
            store.setSearchQuery('test')
            store.setShowSuggestions(true)

            store.clearSearch()

            expect(store.searchState.query).toBe('')
            expect(store.searchState.showSuggestions).toBe(false)
        })

        it('adds to history', () => {
            const store = useProductSearchStore()
            store.addToHistory('test query')

            expect(store.searchState.history).toContain('test query')
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'product-search-history',
                JSON.stringify(['test query'])
            )
        })

        it('loads search history from localStorage', () => {
            const mockHistory = ['query1', 'query2', 'query3']
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockHistory))

            const store = useProductSearchStore()
            store.loadSearchHistory()

            expect(store.searchState.history).toEqual(mockHistory)
            expect(localStorageMock.getItem).toHaveBeenCalledWith('product-search-history')
        })

        it('handles localStorage errors gracefully', () => {
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const store = useProductSearchStore()
            expect(() => store.loadSearchHistory()).not.toThrow()
        })

        it('clears search history', () => {
            const store = useProductSearchStore()
            store.addToHistory('test')
            store.clearSearchHistory()

            expect(store.searchState.history).toEqual([])
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('product-search-history')
        })

        it('builds filters correctly', () => {
            const store = useProductSearchStore()
            store.setSearchQuery('test')
            store.setCategoryFilter(1)
            store.setPriceFilter(1000, 5000)
            store.setStockFilter('available')

            const filters = store.buildFilters([], [])

            expect(filters).toEqual({
                query: 'test',
                category: 1,
                minPrice: 1000,
                maxPrice: 5000,
                stockFilter: 'available'
            })
        })
    })
})
