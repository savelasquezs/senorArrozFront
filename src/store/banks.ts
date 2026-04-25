import { defineStore } from 'pinia'
import { ref } from 'vue'
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

let banksListEnsureInFlight: Promise<void> | null = null

type FetchOpts = ResourceActionOptions

export const useBanksStore = defineStore('banks', () => {
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

    const ensureListLoaded = async () => {
        if (list.value?.items?.length) {
            return
        }
        if (banksListEnsureInFlight) {
            return banksListEnsureInFlight
        }
        banksListEnsureInFlight = fetch({ page: 1, pageSize: 100 }).finally(() => {
            banksListEnsureInFlight = null
        })
        return banksListEnsureInFlight
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
        return run(async () => {
            const response = await bankApi.createBank(payload)
            prependPagedItem(list, response)
            current.value = response
            return response
        }, { ...opts, errorMessage: 'Error de conexion' })
    }

    const update = async (id: number, payload: UpdateBankDto, opts?: FetchOpts) => {
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
        list.value = null
        clearError()
    }

    return {
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
