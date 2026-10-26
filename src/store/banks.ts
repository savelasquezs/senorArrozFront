import { defineStore } from 'pinia'
import { loadPagedCatalog } from '@/helpers/loadPagedCatalog'
import { ref, watch } from 'vue'
import { useAuthStore } from './auth'
import { useBranchContextStore } from './branchContext'
import { bankApi } from '@/services/MainAPI/bankApi'
import type {
    Bank,
    BankDetail,
    BankFilters,
    CreateBankDto,
    UpdateBankDto
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

export const useBanksStore = defineStore('banks', () => {
    const options = ref<Bank[]>([])
    let optionsKey: string | null = null, optionsLoaded = false, optionsVersion = 0
    let optionsPending: Promise<void> | null = null
    function invalidateOptions() { optionsVersion++; optionsLoaded = false; optionsPending = null }

    const list = ref<PagedResult<Bank> | null>(null)
    const current = ref<Bank | null>(null)
    const currentDetail = ref<BankDetail | null>(null)
    const { isLoading, error, run, clearError } = createResourceState()

    const fetch = async (filters?: BankFilters, opts?: FetchOpts) => {
        await run(async () => {
            const response = await bankApi.getBanks(filters)
            list.value = response
        }, { ...opts, errorMessage: 'Error al obtener bancos' })
    }

    const ensureListLoaded = async (branchId?: number | null, forOrderCreation = false) => {
        const key = `${branchId ?? 'default'}:${forOrderCreation}`
        if (optionsKey !== key) { invalidateOptions(); optionsKey = key; options.value = [] }
        if (optionsLoaded) return
        if (optionsPending) return optionsPending
        const version = optionsVersion
        optionsPending = (async () => {
            try {
                const rows = await loadPagedCatalog<Bank>(page => bankApi.getBanks({
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
            const response = await bankApi.getBankById(id)
            current.value = response
        }, { ...opts, errorMessage: 'Error al obtener banco' })
    }

    const fetchDetail = async (id: number, opts?: FetchOpts) => {
        await run(async () => {
            const response = await bankApi.getBankDetail(id)
            currentDetail.value = response
        }, { ...opts, errorMessage: 'Error al obtener detalle del banco' })
    }

    const create = async (payload: CreateBankDto, opts?: FetchOpts) => {
        invalidateOptions()
        return run(async () => {
            const response = await bankApi.createBank(payload)
            prependPagedItem(list, response)
            current.value = response
            return response
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const update = async (id: number, payload: UpdateBankDto, opts?: FetchOpts) => {
        invalidateOptions()
        return run(async () => {
            const response = await bankApi.updateBank(id, payload)
            replacePagedItem(list, response)
            if (current.value?.id === id) {
                current.value = response
            }
            if (currentDetail.value?.id === id) {
                currentDetail.value = { ...currentDetail.value, ...response }
            }
            return response
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const remove = async (id: number, opts?: FetchOpts) => {
        invalidateOptions()
        await run(async () => {
            await bankApi.deleteBank(id)
            removePagedItem(list, id)
            if (current.value?.id === id) {
                current.value = null
            }
            if (currentDetail.value?.id === id) {
                currentDetail.value = null
            }
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const clear = () => {
        current.value = null
        currentDetail.value = null
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
        currentDetail,
        isLoading,
        error,
        fetch,
        ensureListLoaded,
        fetchById,
        fetchDetail,
        create,
        update,
        remove,
        clear,
        clearList,
    }
})
