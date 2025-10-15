import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productCategoryApi } from '@/services/MainAPI/productCategoryApi'
import type { PagedResult } from '@/types/common'
import type {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryFilters
} from '@/types/product'

export const useProductCategoriesStore = defineStore('productCategories', () => {
  // State - CRUD
  const list = ref<PagedResult<ProductCategory> | null>(null)
  const current = ref<ProductCategory | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // State - UI
  const searchQuery = ref('')
  const favorites = ref<Set<number>>(new Set())
  const sortBy = ref<'name' | 'popularity' | 'custom'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')
  const multiSelect = ref(false)
  const selectedCategories = ref<Set<number>>(new Set())

  // Storage keys
  const FAVORITES_KEY = 'senor-arroz-category-favorites'
  const SORT_PREFERENCES_KEY = 'senor-arroz-category-sort'

  // Getters
  const filteredCategories = computed(() => (categories: ProductCategory[]) => {
    let filtered = [...categories]

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(query)
      )
    }

    // Sort categories
    filtered = sortCategories(filtered)

    return filtered
  })

  const sortedCategories = computed(() => (categories: ProductCategory[]) => {
    return sortCategories([...categories])
  })

  const favoriteCategories = computed(() => (categories: ProductCategory[]) => {
    return categories.filter(category => favorites.value.has(category.id))
  })

  const isFavorite = computed(() => (categoryId: number) => {
    return favorites.value.has(categoryId)
  })

  const isSelected = computed(() => (categoryId: number) => {
    return selectedCategories.value.has(categoryId)
  })

  const hasSelectedCategories = computed(() => {
    return selectedCategories.value.size > 0
  })

  const selectedCategoriesList = computed(() => {
    return Array.from(selectedCategories.value)
  })

  const currentCategories = computed(() => list.value?.items || [])
  const totalCategories = computed(() => list.value?.totalCount || 0)

  // Actions - CRUD
  const fetch = async (filters?: ProductCategoryFilters) => {
    try {
      isLoading.value = true
      error.value = null
      const res = await productCategoryApi.getProductCategories(filters)
      list.value = res.data
    } catch (err: any) {
      error.value = err.message || 'Error al cargar categorías'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchById = async (id: number) => {
    try {
      isLoading.value = true
      error.value = null
      const res = await productCategoryApi.getProductCategoryById(id)
      current.value = res.data
    } catch (err: any) {
      error.value = err.message || 'Error al cargar la categoría'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const create = async (payload: CreateProductCategoryDto) => {
    try {
      isLoading.value = true
      error.value = null
      const res = await productCategoryApi.createProductCategory(payload)
      // Add to local list if it exists
      if (list.value) {
        list.value.items.unshift(res.data)
        list.value.totalCount += 1
      }
      return res.data
    } catch (err: any) {
      error.value = err.message || 'Error al crear la categoría'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const update = async (id: number, payload: UpdateProductCategoryDto) => {
    try {
      isLoading.value = true
      error.value = null
      const res = await productCategoryApi.updateProductCategory(id, payload)
      current.value = res.data

      // Update in local list if it exists
      if (list.value) {
        const index = list.value.items.findIndex(category => category.id === id)
        if (index !== -1) {
          list.value.items[index] = res.data
        }
      }

      return res.data
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar la categoría'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const remove = async (id: number) => {
    try {
      isLoading.value = true
      error.value = null
      await productCategoryApi.deleteProductCategory(id)

      // Remove from local list if it exists
      if (list.value) {
        list.value.items = list.value.items.filter(category => category.id !== id)
        list.value.totalCount -= 1
      }

      // Clear current if it's the deleted category
      if (current.value && current.value.id === id) {
        current.value = null
      }
    } catch (err: any) {
      error.value = err.message || 'Error al eliminar la categoría'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const clear = () => {
    current.value = null
    error.value = null
  }

  const clearList = () => {
    list.value = null
    error.value = null
  }

  // Actions - UI
  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const toggleFavorite = (categoryId: number) => {
    if (favorites.value.has(categoryId)) {
      favorites.value.delete(categoryId)
    } else {
      favorites.value.add(categoryId)
    }
    saveFavoritesToStorage()
  }

  const addToFavorites = (categoryId: number) => {
    favorites.value.add(categoryId)
    saveFavoritesToStorage()
  }

  const removeFromFavorites = (categoryId: number) => {
    favorites.value.delete(categoryId)
    saveFavoritesToStorage()
  }

  const clearFavorites = () => {
    favorites.value.clear()
    saveFavoritesToStorage()
  }

  const setSortBy = (sort: 'name' | 'popularity' | 'custom') => {
    sortBy.value = sort
    saveSortPreferencesToStorage()
  }

  const setSortOrder = (order: 'asc' | 'desc') => {
    sortOrder.value = order
    saveSortPreferencesToStorage()
  }

  const toggleSortOrder = () => {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    saveSortPreferencesToStorage()
  }

  const setMultiSelect = (enabled: boolean) => {
    multiSelect.value = enabled
    if (!enabled) {
      selectedCategories.value.clear()
    }
  }

  const toggleCategorySelection = (categoryId: number) => {
    if (multiSelect.value) {
      if (selectedCategories.value.has(categoryId)) {
        selectedCategories.value.delete(categoryId)
      } else {
        selectedCategories.value.add(categoryId)
      }
    } else {
      selectedCategories.value.clear()
      selectedCategories.value.add(categoryId)
    }
  }

  const selectCategory = (categoryId: number) => {
    if (multiSelect.value) {
      selectedCategories.value.add(categoryId)
    } else {
      selectedCategories.value.clear()
      selectedCategories.value.add(categoryId)
    }
  }

  const deselectCategory = (categoryId: number) => {
    selectedCategories.value.delete(categoryId)
  }

  const clearSelection = () => {
    selectedCategories.value.clear()
  }

  const selectAllCategories = (categories: ProductCategory[]) => {
    if (multiSelect.value) {
      categories.forEach(category => {
        selectedCategories.value.add(category.id)
      })
    }
  }

  const selectFavoriteCategories = (categories: ProductCategory[]) => {
    if (multiSelect.value) {
      categories.forEach(category => {
        if (favorites.value.has(category.id)) {
          selectedCategories.value.add(category.id)
        }
      })
    }
  }

  // Helper functions
  const sortCategories = (categories: ProductCategory[]): ProductCategory[] => {
    const sorted = [...categories]

    switch (sortBy.value) {
      case 'name':
        sorted.sort((a, b) => {
          const result = a.name.localeCompare(b.name)
          return sortOrder.value === 'asc' ? result : -result
        })
        break

      case 'popularity':
        sorted.sort((a, b) => {
          const result = a.activeProducts - b.activeProducts
          return sortOrder.value === 'asc' ? result : -result
        })
        break

      case 'custom':
        // First favorites, then by name
        sorted.sort((a, b) => {
          const aIsFavorite = favorites.value.has(a.id)
          const bIsFavorite = favorites.value.has(b.id)

          if (aIsFavorite && !bIsFavorite) return -1
          if (!aIsFavorite && bIsFavorite) return 1

          const nameResult = a.name.localeCompare(b.name)
          return sortOrder.value === 'asc' ? nameResult : -nameResult
        })
        break
    }

    return sorted
  }

  // Storage functions
  const saveFavoritesToStorage = () => {
    try {
      const favoritesArray = Array.from(favorites.value)
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritesArray))
    } catch (error) {
      console.warn('Error saving favorites to localStorage:', error)
    }
  }

  const loadFavoritesFromStorage = () => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY)
      if (saved) {
        const favoritesArray = JSON.parse(saved)
        favorites.value = new Set(favoritesArray)
      }
    } catch (error) {
      console.warn('Error loading favorites from localStorage:', error)
      favorites.value = new Set()
    }
  }

  const saveSortPreferencesToStorage = () => {
    try {
      const preferences = {
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      }
      localStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(preferences))
    } catch (error) {
      console.warn('Error saving sort preferences to localStorage:', error)
    }
  }

  const loadSortPreferencesFromStorage = () => {
    try {
      const saved = localStorage.getItem(SORT_PREFERENCES_KEY)
      if (saved) {
        const preferences = JSON.parse(saved)
        sortBy.value = preferences.sortBy || 'name'
        sortOrder.value = preferences.sortOrder || 'asc'
      }
    } catch (error) {
      console.warn('Error loading sort preferences from localStorage:', error)
      sortBy.value = 'name'
      sortOrder.value = 'asc'
    }
  }

  // Initialize store
  const initializeStore = () => {
    loadFavoritesFromStorage()
    loadSortPreferencesFromStorage()
  }

  // Reset store
  const resetStore = () => {
    searchQuery.value = ''
    favorites.value.clear()
    selectedCategories.value.clear()
    sortBy.value = 'name'
    sortOrder.value = 'asc'
    multiSelect.value = false
  }

  return {
    // State - CRUD
    list,
    current,
    isLoading,
    error,

    // State - UI
    searchQuery,
    favorites,
    sortBy,
    sortOrder,
    multiSelect,
    selectedCategories,

    // Getters
    filteredCategories,
    sortedCategories,
    favoriteCategories,
    isFavorite,
    isSelected,
    hasSelectedCategories,
    selectedCategoriesList,
    currentCategories,
    totalCategories,

    // Actions - CRUD
    fetch,
    fetchById,
    create,
    update,
    remove,
    clear,
    clearList,

    // Actions - UI
    setSearchQuery,
    clearSearch,
    toggleFavorite,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    setMultiSelect,
    toggleCategorySelection,
    selectCategory,
    deselectCategory,
    clearSelection,
    selectAllCategories,
    selectFavoriteCategories,
    initializeStore,
    resetStore
  }
})