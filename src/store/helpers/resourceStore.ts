import { ref } from 'vue'
import type { Ref } from 'vue'
import type { PagedResult } from '@/types/common'

export type ResourceActionOptions = {
    silent?: boolean
    errorMessage?: string
}

export function createResourceState() {
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const run = async <T>(
        task: () => Promise<T>,
        options?: ResourceActionOptions
    ): Promise<T> => {
        try {
            if (!options?.silent) {
                isLoading.value = true
            }
            error.value = null
            return await task()
        } catch (err: unknown) {
            error.value =
                err instanceof Error
                    ? err.message
                    : options?.errorMessage || 'Error inesperado'
            throw err
        } finally {
            if (!options?.silent) {
                isLoading.value = false
            }
        }
    }

    const clearError = () => {
        error.value = null
    }

    return {
        isLoading,
        error,
        run,
        clearError,
    }
}

export function prependPagedItem<T>(list: Ref<PagedResult<T> | null>, item: T): void {
    if (!list.value) {
        return
    }

    list.value.items.unshift(item)
    list.value.totalCount += 1
}

export function replacePagedItem<T extends { id: number }>(
    list: Ref<PagedResult<T> | null>,
    item: T
): void {
    if (!list.value) {
        return
    }

    const index = list.value.items.findIndex((entry) => entry.id === item.id)
    if (index !== -1) {
        list.value.items[index] = item
    }
}

export function removePagedItem<T extends { id: number }>(
    list: Ref<PagedResult<T> | null>,
    id: number
): void {
    if (!list.value) {
        return
    }

    const originalLength = list.value.items.length
    list.value.items = list.value.items.filter((entry) => entry.id !== id)

    if (list.value.items.length !== originalLength) {
        list.value.totalCount -= 1
    }
}
