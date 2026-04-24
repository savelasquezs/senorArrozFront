import { defineStore } from 'pinia'
import { ref } from 'vue'
import { appApi } from '@/services/MainAPI/appApi'
import type {
    App,
    AppFilters,
    CreateAppDto,
    UpdateAppDto
} from '@/types/bank'
import type { PagedResult } from '@/types/common'
import {
    createResourceState,
    prependPagedItem,
    removePagedItem,
    replacePagedItem,
    type ResourceActionOptions,
} from './helpers/resourceStore'

let appsListEnsureInFlight: Promise<void> | null = null

type FetchOpts = ResourceActionOptions

export const useAppsStore = defineStore('apps', () => {
    const list = ref<PagedResult<App> | null>(null)
    const current = ref<App | null>(null)
    const byBank = ref<App[] | null>(null)
    const { isLoading, error, run, clearError } = createResourceState()

    const fetch = async (filters?: AppFilters, opts?: FetchOpts) => {
        await run(async () => {
            const response = await appApi.getApps(filters)
            list.value = response
        }, { ...opts, errorMessage: 'Error al obtener apps' })
    }

    const ensureListLoaded = async () => {
        if (list.value?.items?.length) {
            return
        }
        if (appsListEnsureInFlight) {
            return appsListEnsureInFlight
        }
        appsListEnsureInFlight = fetch({ page: 1, pageSize: 100 }).finally(() => {
            appsListEnsureInFlight = null
        })
        return appsListEnsureInFlight
    }

    const fetchById = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            const response = await appApi.getAppById(id)
            current.value = response
        }, { ...opts, errorMessage: 'Error al obtener app' })
    }

    const fetchByBank = async (bankId: number, opts?: FetchOpts) => {
        await run(async () => {
            const response = await appApi.getAppsByBank(bankId)
            byBank.value = response
        }, { ...opts, errorMessage: 'Error al obtener apps del banco' })
    }

    const create = async (payload: CreateAppDto, opts?: FetchOpts) => {
        return run(async () => {
            const response = await appApi.createApp(payload)
            prependPagedItem(list, response)
            if (byBank.value && response.bankId === payload.bankId) {
                byBank.value.unshift(response)
            }
            current.value = response
            return response
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const update = async (id: number, payload: UpdateAppDto, opts?: FetchOpts) => {
        return run(async () => {
            const response = await appApi.updateApp(id, payload)
            replacePagedItem(list, response)
            if (byBank.value) {
                const index = byBank.value.findIndex(item => item.id === id)
                if (index !== -1) {
                    byBank.value[index] = response
                }
            }
            if (current.value?.id === id) {
                current.value = response
            }
            return response
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const remove = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            await appApi.deleteApp(id)
            removePagedItem(list, id)
            if (byBank.value) {
                byBank.value = byBank.value.filter(item => item.id !== id)
            }
            if (current.value?.id === id) {
                current.value = null
            }
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const clear = () => {
        current.value = null
        clearError()
    }

    const clearList = () => {
        list.value = null
        byBank.value = null
        clearError()
    }

    return {
        list,
        current,
        byBank,
        isLoading,
        error,
        fetch,
        ensureListLoaded,
        fetchById,
        fetchByBank,
        create,
        update,
        remove,
        clear,
        clearList,
    }
})
