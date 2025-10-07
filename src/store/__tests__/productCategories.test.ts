import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductCategoriesStore } from '../productCategories'
import type { ProductCategory } from '@/types/product'

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

// Mock categories data
const mockCategories: ProductCategory[] = [
  {
    id: 1,
    branchId: 1,
    branchName: 'Test Branch',
    name: 'Platos Principales',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    totalProducts: 15,
    activeProducts: 12
  },
  {
    id: 2,
    branchId: 1,
    branchName: 'Test Branch',
    name: 'Bebidas',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    totalProducts: 8,
    activeProducts: 8
  },
  {
    id: 3,
    branchId: 1,
    branchName: 'Test Branch',
    name: 'Postres',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    totalProducts: 5,
    activeProducts: 4
  }
]

describe('ProductCategories Store', () => {
  let store: ReturnType<typeof useProductCategoriesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useProductCategoriesStore()
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Initial State', () => {
    it('has correct initial state', () => {
      expect(store.searchQuery).toBe('')
      expect(store.favorites.size).toBe(0)
      expect(store.sortBy).toBe('name')
      expect(store.sortOrder).toBe('asc')
      expect(store.multiSelect).toBe(false)
      expect(store.selectedCategories.size).toBe(0)
    })
  })

  describe('Search Functionality', () => {
    it('sets search query', () => {
      store.setSearchQuery('test')
      expect(store.searchQuery).toBe('test')
    })

    it('clears search query', () => {
      store.setSearchQuery('test')
      store.clearSearch()
      expect(store.searchQuery).toBe('')
    })

    it('filters categories based on search query', () => {
      store.setSearchQuery('Platos')
      const filtered = store.filteredCategories(mockCategories)
      
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Platos Principales')
    })

    it('returns all categories when search is empty', () => {
      store.setSearchQuery('')
      const filtered = store.filteredCategories(mockCategories)
      
      expect(filtered).toHaveLength(3)
    })

    it('returns empty array when no categories match search', () => {
      store.setSearchQuery('NonExistent')
      const filtered = store.filteredCategories(mockCategories)
      
      expect(filtered).toHaveLength(0)
    })
  })

  describe('Favorites Functionality', () => {
    it('toggles favorite status', () => {
      expect(store.isFavorite(1)).toBe(false)
      
      store.toggleFavorite(1)
      expect(store.isFavorite(1)).toBe(true)
      expect(store.favorites.has(1)).toBe(true)
      
      store.toggleFavorite(1)
      expect(store.isFavorite(1)).toBe(false)
      expect(store.favorites.has(1)).toBe(false)
    })

    it('adds category to favorites', () => {
      store.addToFavorites(1)
      expect(store.isFavorite(1)).toBe(true)
    })

    it('removes category from favorites', () => {
      store.addToFavorites(1)
      store.removeFromFavorites(1)
      expect(store.isFavorite(1)).toBe(false)
    })

    it('clears all favorites', () => {
      store.addToFavorites(1)
      store.addToFavorites(2)
      store.clearFavorites()
      
      expect(store.favorites.size).toBe(0)
      expect(store.isFavorite(1)).toBe(false)
      expect(store.isFavorite(2)).toBe(false)
    })

    it('gets favorite categories', () => {
      store.addToFavorites(1)
      store.addToFavorites(2)
      
      const favorites = store.favoriteCategories(mockCategories)
      expect(favorites).toHaveLength(2)
      expect(favorites.map(c => c.id)).toEqual([1, 2])
    })

    it('saves favorites to localStorage when toggled', () => {
      store.toggleFavorite(1)
      store.toggleFavorite(2)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'senor-arroz-category-favorites',
        JSON.stringify([1, 2])
      )
    })
  })

  describe('Sorting Functionality', () => {
    it('sorts categories by name (ascending)', () => {
      store.setSortBy('name')
      store.setSortOrder('asc')
      
      const sorted = store.sortedCategories(mockCategories)
      expect(sorted[0].name).toBe('Bebidas')
      expect(sorted[1].name).toBe('Platos Principales')
      expect(sorted[2].name).toBe('Postres')
    })

    it('sorts categories by name (descending)', () => {
      store.setSortBy('name')
      store.setSortOrder('desc')
      
      const sorted = store.sortedCategories(mockCategories)
      expect(sorted[0].name).toBe('Postres')
      expect(sorted[1].name).toBe('Platos Principales')
      expect(sorted[2].name).toBe('Bebidas')
    })

    it('sorts categories by popularity (ascending)', () => {
      store.setSortBy('popularity')
      store.setSortOrder('asc')
      
      const sorted = store.sortedCategories(mockCategories)
      expect(sorted[0].activeProducts).toBe(4) // Postres
      expect(sorted[1].activeProducts).toBe(8) // Bebidas
      expect(sorted[2].activeProducts).toBe(12) // Platos Principales
    })

    it('sorts categories by popularity (descending)', () => {
      store.setSortBy('popularity')
      store.setSortOrder('desc')
      
      const sorted = store.sortedCategories(mockCategories)
      expect(sorted[0].activeProducts).toBe(12) // Platos Principales
      expect(sorted[1].activeProducts).toBe(8) // Bebidas
      expect(sorted[2].activeProducts).toBe(4) // Postres
    })

    it('sorts categories by custom (favorites first)', () => {
      store.setSortBy('custom')
      store.addToFavorites(2) // Bebidas
      store.addToFavorites(3) // Postres
      
      const sorted = store.sortedCategories(mockCategories)
      expect(sorted[0].id).toBe(2) // Bebidas (favorite)
      expect(sorted[1].id).toBe(3) // Postres (favorite)
      expect(sorted[2].id).toBe(1) // Platos Principales (not favorite)
    })

    it('toggles sort order', () => {
      store.setSortBy('name')
      store.setSortOrder('asc')
      
      store.toggleSortOrder()
      expect(store.sortOrder).toBe('desc')
      
      store.toggleSortOrder()
      expect(store.sortOrder).toBe('asc')
    })

    it('saves sort preferences to localStorage', () => {
      store.setSortBy('popularity')
      store.setSortOrder('desc')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'senor-arroz-category-sort',
        JSON.stringify({
          sortBy: 'popularity',
          sortOrder: 'desc'
        })
      )
    })
  })

  describe('Selection Functionality', () => {
    it('toggles category selection in single select mode', () => {
      expect(store.isSelected(1)).toBe(false)
      
      store.toggleCategorySelection(1)
      expect(store.isSelected(1)).toBe(true)
      expect(store.selectedCategories.has(1)).toBe(true)
      
      store.toggleCategorySelection(2)
      expect(store.isSelected(1)).toBe(false) // Previous selection cleared
      expect(store.isSelected(2)).toBe(true)
    })

    it('toggles category selection in multi select mode', () => {
      store.setMultiSelect(true)
      
      store.toggleCategorySelection(1)
      store.toggleCategorySelection(2)
      
      expect(store.isSelected(1)).toBe(true)
      expect(store.isSelected(2)).toBe(true)
      expect(store.selectedCategoriesList).toEqual([1, 2])
      
      store.toggleCategorySelection(1) // Toggle off
      expect(store.isSelected(1)).toBe(false)
      expect(store.isSelected(2)).toBe(true)
    })

    it('clears selection when disabling multi select', () => {
      store.setMultiSelect(true)
      store.toggleCategorySelection(1)
      store.toggleCategorySelection(2)
      
      store.setMultiSelect(false)
      expect(store.selectedCategories.size).toBe(0)
    })

    it('selects specific category', () => {
      store.selectCategory(1)
      expect(store.isSelected(1)).toBe(true)
      
      store.selectCategory(2)
      expect(store.isSelected(1)).toBe(false) // Previous cleared in single select
      expect(store.isSelected(2)).toBe(true)
    })

    it('deselects specific category', () => {
      store.setMultiSelect(true)
      store.toggleCategorySelection(1)
      store.toggleCategorySelection(2)
      
      store.deselectCategory(1)
      expect(store.isSelected(1)).toBe(false)
      expect(store.isSelected(2)).toBe(true)
    })

    it('clears all selections', () => {
      store.setMultiSelect(true)
      store.toggleCategorySelection(1)
      store.toggleCategorySelection(2)
      
      store.clearSelection()
      expect(store.selectedCategories.size).toBe(0)
      expect(store.hasSelectedCategories).toBe(false)
    })

    it('selects all categories', () => {
      store.setMultiSelect(true)
      store.selectAllCategories(mockCategories)
      
      expect(store.selectedCategories.size).toBe(3)
      expect(store.selectedCategoriesList).toEqual([1, 2, 3])
    })

    it('selects only favorite categories', () => {
      store.setMultiSelect(true)
      store.addToFavorites(1)
      store.addToFavorites(3)
      
      store.selectFavoriteCategories(mockCategories)
      
      expect(store.selectedCategories.size).toBe(2)
      expect(store.selectedCategoriesList).toEqual([1, 3])
    })
  })

  describe('Storage Integration', () => {
    it('loads favorites from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValue('[1, 2]')
      
      store.initializeStore()
      
      expect(store.isFavorite(1)).toBe(true)
      expect(store.isFavorite(2)).toBe(true)
      expect(store.isFavorite(3)).toBe(false)
    })

    it('loads sort preferences from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValueOnce(null) // favorites
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({
        sortBy: 'popularity',
        sortOrder: 'desc'
      }))
      
      store.initializeStore()
      
      expect(store.sortBy).toBe('popularity')
      expect(store.sortOrder).toBe('desc')
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      expect(() => store.initializeStore()).not.toThrow()
      expect(store.favorites.size).toBe(0)
      expect(store.sortBy).toBe('name')
    })

    it('handles invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')
      
      expect(() => store.initializeStore()).not.toThrow()
      expect(store.favorites.size).toBe(0)
    })
  })

  describe('Store Reset', () => {
    it('resets store to initial state', () => {
      store.setSearchQuery('test')
      store.addToFavorites(1)
      store.setMultiSelect(true)
      store.toggleCategorySelection(2)
      store.setSortBy('popularity')
      store.setSortOrder('desc')
      
      store.resetStore()
      
      expect(store.searchQuery).toBe('')
      expect(store.favorites.size).toBe(0)
      expect(store.selectedCategories.size).toBe(0)
      expect(store.sortBy).toBe('name')
      expect(store.sortOrder).toBe('asc')
      expect(store.multiSelect).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('returns correct selected categories list', () => {
      store.setMultiSelect(true)
      store.toggleCategorySelection(1)
      store.toggleCategorySelection(3)
      
      expect(store.selectedCategoriesList).toEqual([1, 3])
    })

    it('indicates when categories are selected', () => {
      expect(store.hasSelectedCategories).toBe(false)
      
      store.toggleCategorySelection(1)
      expect(store.hasSelectedCategories).toBe(true)
    })
  })
})
