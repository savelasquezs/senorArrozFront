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
import {
  createResourceState,
  prependPagedItem,
  removePagedItem,
  replacePagedItem,
} from './helpers/resourceStore'

export const ORDER_CATALOG_CATEGORY_PAGE_SIZE = 100

let categoriesCatalogLoadInFlight: Promise<void> | null = null

export const useProductCategoriesStore = defineStore('productCategories', () => {
  const list = ref<PagedResult<ProductCategory> | null>(null)
  const current = ref<ProductCategory | null>(null)
  const { isLoading, error, run, clearError } = createResourceState()

  const searchQuery = ref('')
  const favorites = ref<Set<number>>(new Set())
  const sortBy = ref<'name' | 'popularity' | 'custom'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')
  const multiSelect = ref(false)
  const selectedCategories = ref<Set<number>>(new Set())

  const FAVORITES_KEY = 'senor-arroz-category-favorites'
  const SORT_PREFERENCES_KEY = 'senor-arroz-category-sort'

  const filteredCategories = computed(() => (categories: ProductCategory[]) => {
    let filtered = [...categories]

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(query)
      )
    }

    return sortCategories(filtered)
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

  const fetch = async (filters?: ProductCategoryFilters, opts?: { silent?: boolean }) => {
    await run(async () => {
      const res = await productCategoryApi.getProductCategories(filters)
      list.value = res.data
    }, { ...opts, errorMessage: 'Error al cargar categorias' })
  }

  const ensureCatalogLoaded = async () => {
    if (list.value?.items && list.value.items.length > 0) {
      return
    }
    if (categoriesCatalogLoadInFlight) {
      return categoriesCatalogLoadInFlight
    }
    categoriesCatalogLoadInFlight = (async () => {
      try {
        await fetch({
          page: 1,
          pageSize: ORDER_CATALOG_CATEGORY_PAGE_SIZE,
          sortBy: 'name',
          sortOrder: 'asc',
        })
      } finally {
        categoriesCatalogLoadInFlight = null
      }
    })()
    return categoriesCatalogLoadInFlight
  }

  const fetchById = async (id: number, opts?: { silent?: boolean }) => {
    await run(async () => {
      const res = await productCategoryApi.getProductCategoryById(id)
      current.value = res.data
    }, { ...opts, errorMessage: 'Error al cargar la categoria' })
  }

  const create = async (payload: CreateProductCategoryDto, opts?: { silent?: boolean }) => {
    return run(async () => {
      const res = await productCategoryApi.createProductCategory(payload)
      prependPagedItem(list, res.data)
      return res.data
    }, { ...opts, errorMessage: 'Error al crear la categoria' })
  }

  const update = async (id: number, payload: UpdateProductCategoryDto, opts?: { silent?: boolean }) => {
    return run(async () => {
      const res = await productCategoryApi.updateProductCategory(id, payload)
      current.value = res.data
      replacePagedItem(list, res.data)
      return res.data
    }, { ...opts, errorMessage: 'Error al actualizar la categoria' })
  }

  const remove = async (id: number, opts?: { silent?: boolean }) => {
    await run(async () => {
      await productCategoryApi.deleteProductCategory(id)
      removePagedItem(list, id)

      if (current.value?.id === id) {
        current.value = null
      }
    }, { ...opts, errorMessage: 'Error al eliminar la categoria' })
  }

  const clear = () => {
    current.value = null
    clearError()
  }

  const clearList = () => {
    list.value = null
    clearError()
  }

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

  const initializeStore = () => {
    loadFavoritesFromStorage()
    loadSortPreferencesFromStorage()
  }

  const resetStore = () => {
    searchQuery.value = ''
    favorites.value.clear()
    selectedCategories.value.clear()
    sortBy.value = 'name'
    sortOrder.value = 'asc'
    multiSelect.value = false
  }

  return {
    list,
    current,
    isLoading,
    error,
    searchQuery,
    favorites,
    sortBy,
    sortOrder,
    multiSelect,
    selectedCategories,
    filteredCategories,
    sortedCategories,
    favoriteCategories,
    isFavorite,
    isSelected,
    hasSelectedCategories,
    selectedCategoriesList,
    currentCategories,
    totalCategories,
    fetch,
    ensureCatalogLoaded,
    fetchById,
    create,
    update,
    remove,
    clear,
    clearList,
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
