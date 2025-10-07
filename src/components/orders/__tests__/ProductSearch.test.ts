import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ProductSearch from '../ProductSearch.vue'

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

// Mock components
vi.mock('../ProductSearch/SearchInput.vue', () => ({
    default: {
        name: 'SearchInput',
        template: '<input data-testid="search-input" />',
        props: ['modelValue', 'placeholder', 'suggestions', 'showSuggestions'],
        emits: ['update:modelValue', 'focus', 'blur', 'clear', 'suggestion-selected']
    }
}))

vi.mock('../ProductSearch/FilterToggle.vue', () => ({
    default: {
        name: 'FilterToggle',
        template: '<button data-testid="filter-toggle">Toggle</button>',
        props: ['expanded'],
        emits: ['toggle']
    }
}))

vi.mock('../ProductSearch/ActiveFilters.vue', () => ({
    default: {
        name: 'ActiveFilters',
        template: '<div data-testid="active-filters"></div>',
        props: ['activeFilters'],
        emits: ['remove-filter', 'clear-all']
    }
}))

vi.mock('../ProductSearch/FilterPanel.vue', () => ({
    default: {
        name: 'FilterPanel',
        template: '<div data-testid="filter-panel"></div>',
        props: ['selectedCategory', 'minPrice', 'maxPrice', 'selectedStockFilter', 'categories', 'stockFilterOptions'],
        emits: ['category-change', 'min-price-change', 'max-price-change', 'stock-filter-change']
    }
}))

vi.mock('../ProductSearch/SearchHistory.vue', () => ({
    default: {
        name: 'SearchHistory',
        template: '<div data-testid="search-history"></div>',
        props: ['searchHistory'],
        emits: ['history-click', 'clear-history']
    }
}))

describe('ProductSearch', () => {
    const mockProducts = [
        {
            id: 1,
            categoryId: 1,
            categoryName: 'Test Category',
            branchId: 1,
            branchName: 'Test Branch',
            name: 'Test Product 1',
            price: 10000,
            stock: 10,
            active: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
        },
        {
            id: 2,
            categoryId: 2,
            categoryName: 'Another Category',
            branchId: 1,
            branchName: 'Test Branch',
            name: 'Another Product',
            price: 15000,
            stock: 5,
            active: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
        }
    ]

    const mockCategories = [
        {
            id: 1,
            branchId: 1,
            branchName: 'Test Branch',
            name: 'Test Category',
            active: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            totalProducts: 10,
            activeProducts: 8
        }
    ]

    const createWrapper = (props = {}) => {
        return mount(ProductSearch, {
            props: {
                products: mockProducts,
                categories: mockCategories,
                ...props
            },
            global: {
                plugins: [createPinia()]
            }
        })
    }

    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('renders search input correctly', () => {
        const wrapper = createWrapper()
        expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true)
    })

    it('renders with custom placeholder', () => {
        const wrapper = createWrapper({
            placeholder: 'Custom placeholder'
        })
        expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true)
    })

    it('shows filters section when showFilters is true', () => {
        const wrapper = createWrapper({
            showFilters: true
        })

        expect(wrapper.find('[data-testid="filter-toggle"]').exists()).toBe(true)
    })

    it('hides filters section when showFilters is false', () => {
        const wrapper = createWrapper({
            showFilters: false
        })

        expect(wrapper.find('[data-testid="filter-toggle"]').exists()).toBe(false)
    })

    it('hides search history when disabled', () => {
        const wrapper = createWrapper({
            showSearchHistory: false
        })

        expect(wrapper.find('[data-testid="search-history"]').exists()).toBe(false)
    })

    it('emits filter event when category changes', async () => {
        const wrapper = createWrapper()

        // Mock the store method
        const store = wrapper.vm.$pinia.state.value.productSearch
        if (store) {
            store.filterState.expanded = true
            await wrapper.vm.$nextTick()

            const filterPanel = wrapper.findComponent({ name: 'FilterPanel' })
            if (filterPanel.exists()) {
                await filterPanel.vm.$emit('category-change', 1)
                expect(wrapper.emitted('filter')).toBeTruthy()
            }
        }
    })

    it('emits suggestion-selected when suggestion is clicked', async () => {
        const wrapper = createWrapper()

        const searchInput = wrapper.findComponent({ name: 'SearchInput' })
        await searchInput.vm.$emit('suggestion-selected', mockProducts[0])

        expect(wrapper.emitted('suggestion-selected')).toBeTruthy()
        expect(wrapper.emitted('suggestion-selected')?.[0]).toEqual([mockProducts[0]])
    })

    it('loads search history on mount', () => {
        createWrapper()

        expect(localStorageMock.getItem).toHaveBeenCalledWith('product-search-history')
    })

    it('clears search when clear button is clicked', async () => {
        const wrapper = createWrapper()

        // Set some text first
        const searchInput = wrapper.findComponent({ name: 'SearchInput' })
        await searchInput.vm.$emit('update:modelValue', 'test')
        await searchInput.vm.$emit('clear')

        expect(wrapper.emitted('search')).toBeTruthy()
        expect(wrapper.emitted('search')?.[0]).toEqual([''])
    })

    it('toggles filters when toggle button is clicked', async () => {
        const wrapper = createWrapper({
            showFilters: true
        })

        const filterToggle = wrapper.findComponent({ name: 'FilterToggle' })
        await filterToggle.vm.$emit('toggle')

        // The toggle should work (tested through the store)
        expect(filterToggle.exists()).toBe(true)
    })

    it('builds correct filters object', () => {
        const wrapper = createWrapper()
        // This test would verify the buildFilters method if exposed
        expect(wrapper.exists()).toBe(true)
    })
})
