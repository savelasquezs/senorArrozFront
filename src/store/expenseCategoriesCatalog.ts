import { defineStore } from 'pinia'
import { ref } from 'vue'
import { expenseCategoryApi } from '@/services/MainAPI/expenseCategoryApi'
import type { PagedResult } from '@/types/common'
import type { ExpenseCategory } from '@/types/expense'

/**
 * Primera página de categorías de gasto (transversal). Evita repetir GET al reabrir BranchDetail u otras vistas.
 */
export const useExpenseCategoriesCatalogStore = defineStore('expenseCategoriesCatalog', () => {
	const firstPage = ref<PagedResult<ExpenseCategory> | null>(null)
	const cachedPageSize = ref<number | null>(null)
	let loadInFlight: Promise<void> | null = null

	async function ensureFirstPage(pageSize: number) {
		if (
			firstPage.value?.items?.length &&
			cachedPageSize.value === pageSize
		) {
			return
		}
		if (loadInFlight) {
			return loadInFlight
		}
		loadInFlight = (async () => {
			try {
				const response = await expenseCategoryApi.getExpenseCategories({
					page: 1,
					pageSize,
				})
				if (response.isSuccess && response.data) {
					firstPage.value = response.data
					cachedPageSize.value = pageSize
				}
			} finally {
				loadInFlight = null
			}
		})()
		return loadInFlight
	}

	function invalidate() {
		firstPage.value = null
		cachedPageSize.value = null
	}

	return { firstPage, ensureFirstPage, invalidate }
})
