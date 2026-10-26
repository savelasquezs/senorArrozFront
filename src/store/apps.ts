import { defineStore } from 'pinia'
import { loadPagedCatalog } from '@/helpers/loadPagedCatalog'
import { ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { useBranchContextStore } from './branchContext'
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

type FetchOpts = ResourceActionOptions

export const useAppsStore = defineStore('apps', () => {
    const options = ref<App[]>([])
    let optionsKey: string | null = null, optionsLoaded = false, optionsVersion = 0
    let optionsPending: Promise<void> | null = null
    function invalidateOptions() { optionsVersion++; optionsLoaded = false; optionsPending = null }

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

    const ensureListLoaded = async (branchId?: number | null, forOrderCreation = false) => {
        const key = `${branchId ?? 'default'}:${forOrderCreation}`
        if (optionsKey !== key) { invalidateOptions(); optionsKey = key; options.value = [] }
        if (optionsLoaded) return
        if (optionsPending) return optionsPending
        const version = optionsVersion
        optionsPending = (async () => {
            try {
                const rows = await loadPagedCatalog<App>(page => appApi.getApps({
                    branchId: branchId ?? undefined, forOrderCreation, page, pageSize: 100,
                }), () => {})
                if (version !== optionsVersion) return
                options.value = rows; optionsLoaded = true
            } finally { if (version === optionsVersion) optionsPending = null }
        })()
        return optionsPending
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
        invalidateOptions()
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
        invalidateOptions()
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
        invalidateOptions()
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
        invalidateOptions(); options.value = []; optionsKey = null
        list.value = null
        clearError()
    }

    const auth = useAuthStore(), branches = useBranchContextStore()
    watch(() => [auth.user?.id, auth.user?.role, branches.revision], () => { clear(); clearList() }, { flush: 'sync' })

    return {
        options,
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
